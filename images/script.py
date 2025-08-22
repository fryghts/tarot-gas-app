import os

def compile_files_to_txt(folder_path, output_file):
    with open(output_file, "w", encoding="utf-8") as outfile:
        for file in os.listdir(folder_path):
            file_path = os.path.join(folder_path, file)
            if os.path.isfile(file_path):  # только файлы, без папок
                try:
                    with open(file_path, "r", encoding="utf-8") as infile:
                        outfile.write(f"===== {file} =====\n\n")
                        outfile.write(infile.read())
                        outfile.write("\n\n")
                except Exception as e:
                    print(f"Не удалось прочитать {file_path}: {e}")

if __name__ == "__main__":
    folder = "C:\\Users\\Администратор\\Desktop\\tarot-gas-app"  # укажи папку
    output = "all_code.txt"        # имя итогового файла
    compile_files_to_txt(folder, output)
    print(f"Все файлы собраны в {output}")
