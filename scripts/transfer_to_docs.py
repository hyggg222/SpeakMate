import os
import pypandoc
from pathlib import Path

# Chỉ định đường dẫn Pandoc ở ổ D
os.environ['PYPANDOC_PANDOC'] = r'D:/pandoc/pandoc.exe'

def convert_md_to_docx(source_dir, output_dir):
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    for file_path in Path(source_dir).glob("*.md"):
        output_file_path = os.path.join(output_dir, file_path.stem + ".docx")

        try:
            # Chuyển từ md sang docx
            pypandoc.convert_file(str(file_path), 'docx', outputfile=output_file_path)
            print(f"✔ Đã chuyển: {file_path.name} -> .docx")
        except Exception as e:
            print(f"❌ Lỗi tại {file_path.name}: {e}")

if __name__ == "__main__":
    source = r"D:/SpeakMate/_bmad-output/planning-artifacts"
    output = r"D:/SpeakMate/docs_final"
    convert_md_to_docx(source, output)