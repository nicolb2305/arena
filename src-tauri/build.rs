use std::path::Path;
use std::process::Command;

fn main() {
    Command::new("python")
        .arg(
            Path::new(file!())
                .parent()
                .unwrap()
                .join("python/parse.py")
                .to_str()
                .unwrap(),
        )
        .spawn()
        .unwrap();
    tauri_build::build();
}
