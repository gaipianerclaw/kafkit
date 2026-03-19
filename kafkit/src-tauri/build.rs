fn main() {
    // 告诉 rdkafka 使用静态链接
    std::env::set_var("RDKAFKA_STATIC", "1");
    
    tauri_build::build()
}
