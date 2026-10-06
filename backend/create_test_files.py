"""
Test file generator script for Reliable UDP Lab.
Creates test files of various types and sizes.
"""
import os
import hashlib

def create_test_files(target_dir: str = "test_files"):
    os.makedirs(target_dir, exist_ok=True)
    
    # 1. small.txt
    small_txt_path = os.path.join(target_dir, "small.txt")
    with open(small_txt_path, "w", encoding="utf-8") as f:
        f.write("Welcome to Reliable UDP Lab!\nThis tests Stop-and-Wait, Go-Back-N, and Selective Repeat protocols.\n" * 20)
        
    # 2. sample.pdf (Valid minimal PDF)
    pdf_path = os.path.join(target_dir, "sample.pdf")
    pdf_content = (
        b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
        b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"
        b"3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources <<>> /MediaBox [0 0 612 792] /Contents 4 0 R >>\nendobj\n"
        b"4 0 obj\n<< /Length 55 >>\nstream\nBT /F1 24 Tf 100 700 Td (Reliable UDP Lab Test PDF) Tj ET\nendstream\nendobj\n"
        b"xref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000214 00000 n \n"
        b"trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n318\n%%EOF\n"
    )
    with open(pdf_path, "wb") as f:
        f.write(pdf_content)

    # 3. image.jpg (Valid minimal 1x1 JPEG)
    jpg_path = os.path.join(target_dir, "image.jpg")
    jpg_content = bytes.fromhex(
        "ffd8ffe000104a46494600010101004800480000ffdb004300080606070605080707070909080a0c140d0c0b0b0c1912130f141d1a1f1e1d1a1c1c20242e2720222c231c1c2837292c30313434341f27393d38323c2e333432ffc0000b080001000101011100ffc4001f0000010501010101010100000000000000000102030405060708090a0bffda0008010100003f007f00ffd9"
    )
    with open(jpg_path, "wb") as f:
        f.write(jpg_content * 50)  # Multiplied to give non-trivial payload

    # 4. data_5mb.bin (5 MB binary pattern)
    bin_path = os.path.join(target_dir, "data_5mb.bin")
    chunk = bytes([i % 256 for i in range(1024)])
    with open(bin_path, "wb") as f:
        for _ in range(5 * 1024):  # 5 MB
            f.write(chunk)

    print("Test files generated in:", target_dir)

if __name__ == "__main__":
    create_test_files()
