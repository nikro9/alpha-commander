use std::fs;
use std::io::Read;
use std::path::Path;
use std::process::{Command, Stdio};
#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

use serde::Serialize;
use tauri::{AppHandle, Emitter};

// ── Data structures ─────────────────────────────────────────────

#[derive(Serialize)]
pub struct PngListResult {
    count: usize,
    preview: Vec<String>,
    files: Vec<String>,
}

#[derive(Serialize)]
pub struct FfmpegStatus {
    detected: bool,
    path: String,
    version: String,
}

#[derive(Serialize)]
pub struct ConvertResult {
    success: bool,
    message: String,
    output_path: String,
}

// ── Natural sort helper ─────────────────────────────────────────

#[derive(PartialEq, Eq, PartialOrd, Ord)]
enum NatPart {
    Text(String),
    Num(u64),
}

fn nat_key(s: &str) -> Vec<NatPart> {
    let mut parts = Vec::new();
    let mut it = s.chars().peekable();
    while it.peek().is_some() {
        if it.peek().unwrap().is_ascii_digit() {
            let mut n = String::new();
            while it.peek().map_or(false, |c| c.is_ascii_digit()) {
                n.push(it.next().unwrap());
            }
            parts.push(NatPart::Num(n.parse().unwrap_or(0)));
        } else {
            let mut t = String::new();
            while it.peek().map_or(false, |c| !c.is_ascii_digit()) {
                t.push(it.next().unwrap());
            }
            parts.push(NatPart::Text(t.to_lowercase()));
        }
    }
    parts
}

// ── Tauri commands ──────────────────────────────────────────────

#[tauri::command]
async fn pick_folder() -> Result<Option<String>, String> {
    let handle = rfd::AsyncFileDialog::new()
        .set_title("Seleccionar carpeta")
        .pick_folder()
        .await;
    Ok(handle.map(|h| h.path().to_string_lossy().to_string()))
}

#[tauri::command]
async fn pick_file() -> Result<Option<String>, String> {
    let handle = rfd::AsyncFileDialog::new()
        .set_title("Seleccionar archivo WebM")
        .add_filter("WebM Video", &["webm"])
        .add_filter("Todos los archivos", &["*"])
        .pick_file()
        .await;
    Ok(handle.map(|h| h.path().to_string_lossy().to_string()))
}

#[tauri::command]
fn list_pngs(folder: &str) -> Result<PngListResult, String> {
    let p = Path::new(folder);
    if !p.is_dir() {
        return Err("La ruta no es una carpeta válida".into());
    }
    let mut pngs: Vec<String> = fs::read_dir(p)
        .map_err(|e| format!("Error leyendo carpeta: {e}"))?
        .filter_map(|e| e.ok())
        .filter(|e| {
            e.path()
                .extension()
                .map(|x| x.to_ascii_lowercase() == "png")
                .unwrap_or(false)
        })
        .map(|e| e.file_name().to_string_lossy().to_string())
        .collect();

    pngs.sort_by(|a, b| nat_key(a).cmp(&nat_key(b)));
    let preview: Vec<String> = pngs.iter().take(6).cloned().collect();
    let count = pngs.len();
    Ok(PngListResult {
        count,
        preview,
        files: pngs,
    })
}

const FFMPEG_BYTES: &[u8] = include_bytes!("../ffmpeg.exe");

fn get_embedded_ffmpeg() -> String {
    let tmp = std::env::temp_dir().join("alpha_commander_ffmpeg.exe");
    if !tmp.exists() || fs::metadata(&tmp).map(|m| m.len()).unwrap_or(0) != FFMPEG_BYTES.len() as u64 {
        let _ = fs::write(&tmp, FFMPEG_BYTES);
    }
    tmp.to_string_lossy().to_string()
}

#[tauri::command]
fn detect_ffmpeg(_custom_path: Option<String>) -> FfmpegStatus {
    let path = get_embedded_ffmpeg();
    if let Ok(out) = Command::new(&path)
        .arg("-version")
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
    {
        if out.status.success() {
            let ver = String::from_utf8_lossy(&out.stdout)
                .lines()
                .next()
                .unwrap_or("unknown")
                .to_string();
            return FfmpegStatus {
                detected: true,
                path,
                version: ver,
            };
        }
    }
    FfmpegStatus {
        detected: false,
        path: String::new(),
        version: String::new(),
    }
}

#[tauri::command]
async fn convert_to_webm(
    app: AppHandle,
    input_folder: String,
    output_folder: String,
    output_name: String,
    fps: u32,
    ffmpeg_path: Option<String>,
    boomerang: bool,
) -> Result<ConvertResult, String> {
    // 1. List & validate PNGs
    let list = list_pngs(&input_folder)?;
    if list.count == 0 {
        return Err("No se encontraron PNG en la carpeta".into());
    }

    let ffmpeg = get_embedded_ffmpeg();
    let inp = Path::new(&input_folder);
    let dur = 1.0 / fps as f64;

    // 2. Build concat list
    let mut lines: Vec<String> = Vec::new();
    for f in &list.files {
        let full = inp.join(f).to_string_lossy().replace('\\', "/");
        lines.push(format!("file '{full}'"));
        lines.push(format!("duration {dur:.6}"));
    }
    // Boomerang: append reversed frames (skip first & last to avoid stutter)
    if boomerang && list.files.len() > 2 {
        for f in list.files.iter().rev().skip(1).take(list.files.len() - 2) {
            let full = inp.join(f).to_string_lossy().replace('\\', "/");
            lines.push(format!("file '{full}'"));
            lines.push(format!("duration {dur:.6}"));
        }
    }
    // Last entry without duration (concat demuxer requirement)
    if let Some(last) = list.files.first() {
        let full = inp.join(last).to_string_lossy().replace('\\', "/");
        lines.push(format!("file '{full}'"));
    }

    let tmp = std::env::temp_dir().join("alpha_commander_concat.txt");
    fs::write(&tmp, lines.join("\n"))
        .map_err(|e| format!("Error escribiendo archivo temporal: {e}"))?;

    // 3. Ensure output dir exists
    let out_dir = Path::new(&output_folder);
    if !out_dir.exists() {
        fs::create_dir_all(out_dir)
            .map_err(|e| format!("Error creando carpeta de salida: {e}"))?;
    }
    let out_file = out_dir.join(format!("{output_name}.webm"));
    let out_str = out_file.to_string_lossy().to_string();

    let total = if boomerang && list.count > 2 {
        list.count * 2 - 2
    } else {
        list.count
    };

    let _ = app.emit(
        "conv-progress",
        serde_json::json!({"stage":"start","msg":format!("Procesando {total} frames..."),"pct":0}),
    );

    // 4. Spawn FFmpeg
    let mut cmd = Command::new(&ffmpeg);
    #[cfg(target_os = "windows")]
    cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW

    let mut child = cmd.args([
            "-y",
            "-f", "concat",
            "-safe", "0",
            "-i", &tmp.to_string_lossy(),
            "-c:v", "libvpx-vp9",
            "-pix_fmt", "yuva420p",
            "-b:v", "0",
            "-crf", "18",
            "-auto-alt-ref", "0",
            "-metadata:s:v:0", "alpha_mode=1",
            &out_str,
        ])
        .stdout(Stdio::null())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("No se pudo ejecutar FFmpeg: {e}"))?;

    // 5. Parse stderr for progress
    if let Some(mut stderr) = child.stderr.take() {
        let ac = app.clone();
        let t = total;
        std::thread::spawn(move || {
            let mut buf = Vec::new();
            let mut byte = [0u8; 1];
            loop {
                match stderr.read(&mut byte) {
                    Ok(0) | Err(_) => break,
                    Ok(_) => {
                        if byte[0] == b'\r' || byte[0] == b'\n' {
                            let line = String::from_utf8_lossy(&buf);
                            if line.contains("frame=") {
                                if let Some(part) = line.split("frame=").nth(1) {
                                    let fnum: usize = part
                                        .trim()
                                        .split(|c: char| !c.is_ascii_digit())
                                        .next()
                                        .and_then(|s| s.parse().ok())
                                        .unwrap_or(0);
                                    let pct = if t > 0 {
                                        ((fnum as f64 / t as f64) * 100.0).min(99.0) as u32
                                    } else {
                                        0
                                    };
                                    let _ = ac.emit(
                                        "conv-progress",
                                        serde_json::json!({"stage":"encoding","msg":format!("Frame {fnum}/{t}"),"pct":pct}),
                                    );
                                }
                            }
                            buf.clear();
                        } else {
                            buf.push(byte[0]);
                        }
                    }
                }
            }
        });
    }

    let status = child.wait().map_err(|e| format!("Error esperando FFmpeg: {e}"))?;
    let _ = fs::remove_file(&tmp);

    if status.success() {
        let _ = app.emit(
            "conv-progress",
            serde_json::json!({"stage":"done","msg":"¡Conversión completada!","pct":100}),
        );
        Ok(ConvertResult {
            success: true,
            message: format!("✓ WebM generado: {out_str}"),
            output_path: out_str,
        })
    } else {
        Err(format!(
            "FFmpeg terminó con error (código {})",
            status.code().unwrap_or(-1)
        ))
    }
}

#[tauri::command]
fn open_url(url: String) {
    #[cfg(target_os = "windows")]
    let _ = Command::new("cmd")
        .args(["/C", "start", "", &url])
        .creation_flags(0x08000000)
        .spawn();
    
    #[cfg(not(target_os = "windows"))]
    let _ = Command::new("open").arg(&url).spawn();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            pick_folder,
            pick_file,
            list_pngs,
            detect_ffmpeg,
            convert_to_webm,
            open_url,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
