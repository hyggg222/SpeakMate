import os
import pypandoc
from pathlib import Path

os.environ['PYPANDOC_PANDOC'] = r'D:/pandoc/pandoc.exe'

def convert_docx_to_md(source_dir, output_dir):
    # 1. Tạo thư mục đích nếu chưa tồn tại
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        print(f"✅ Đã tạo thư mục: {output_dir}")

    # 2. Quét tất cả file trong thư mục nguồn
    for file_path in Path(source_dir).glob("*.docx"):
        # Bỏ qua các file tạm của Word (thường bắt đầu bằng ~$)
        if file_path.name.startswith("~$"):
            continue

        # Định nghĩa tên file đầu ra
        output_file_name = file_path.stem + ".md"
        output_file_path = os.path.join(output_dir, output_file_name)

        try:
            # 3. Tiến hành chuyển đổi
            # 'gfm' là GitHub Flavored Markdown - định dạng chuẩn nhất
            pypandoc.convert_file(str(file_path), 'gfm', outputfile=output_file_path)
            print(f"✔ Đã chuyển đổi: {file_path.name} -> {output_file_name}")
        except Exception as e:
            print(f"❌ Lỗi khi chuyển đổi {file_path.name}: {e}")

# --- CẤU HÌNH ĐƯỜNG DẪN TẠI ĐÂY ---
source_folder = "D:/SpeakMate/ideas_docs"  # Thư mục chứa file .docx
destination_folder = "D:/SpeakMate/ideas_markdown"  # Thư mục lưu file .md

if __name__ == "__main__":
    # Tự động tải Pandoc nếu máy chưa có
    try:
        pypandoc.get_pandoc_version()
    except OSError:
        print("⏳ Đang tải Pandoc... (chỉ thực hiện lần đầu)")
        pypandoc.download_pandoc()

    convert_docx_to_md(source_folder, destination_folder)
    print("\n🚀 Hoàn thành!")