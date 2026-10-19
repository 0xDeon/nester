// Shared build script referenced by every deployable contract crate via
// `build = "../../build-meta.rs"` in their Cargo.toml.
//
// Sets GIT_COMMIT_HASH for the contractmeta! embed. The env var is respected
// as-is when already set by CI (e.g. GITHUB_SHA), so builds are reproducible.
fn main() {
    let hash = std::env::var("GIT_COMMIT_HASH").unwrap_or_else(|_| {
        std::process::Command::new("git")
            .args(["rev-parse", "--short", "HEAD"])
            .output()
            .ok()
            .and_then(|o| String::from_utf8(o.stdout).ok())
            .map(|s| s.trim().to_owned())
            .unwrap_or_else(|| "unknown".to_string())
    });
    println!("cargo:rustc-env=GIT_COMMIT_HASH={hash}");
    println!("cargo:rerun-if-changed=.git/HEAD");
    println!("cargo:rerun-if-env-changed=GIT_COMMIT_HASH");
}
