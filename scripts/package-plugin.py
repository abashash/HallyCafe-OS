import os
import zipfile

def create_zip(archive_path, root_dir_name, files_map):
    with zipfile.ZipFile(archive_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for arc_rel_path, src_file_path in files_map.items():
            full_arc_name = f"{root_dir_name}/{arc_rel_path}"
            zipf.write(src_file_path, full_arc_name)
    print(f"Created {archive_path}")

base_dir = "/app/applet"
hally_files_HallyCafeOS = {
    "HallyCafe-OS.php": f"{base_dir}/wordpress-plugin/HallyCafe-OS.php",
    "readme.txt": f"{base_dir}/wordpress-plugin/readme.txt",
    "assets/css/hally-native.css": f"{base_dir}/wordpress-plugin/assets/css/hally-native.css",
    "assets/js/hally-native.js": f"{base_dir}/wordpress-plugin/assets/js/hally-native.js",
}

hally_files_hallycafe = {
    "hally-cafe.php": f"{base_dir}/wordpress-plugin/hally-cafe.php",
    "readme.txt": f"{base_dir}/wordpress-plugin/readme.txt",
    "assets/css/hally-native.css": f"{base_dir}/wordpress-plugin/assets/css/hally-native.css",
    "assets/js/hally-native.js": f"{base_dir}/wordpress-plugin/assets/js/hally-native.js",
}

# 1. HallyCafe-OS.zip in public and wordpress-plugin
create_zip(f"{base_dir}/public/HallyCafe-OS.zip", "HallyCafe-OS", hally_files_HallyCafeOS)
create_zip(f"{base_dir}/wordpress-plugin/HallyCafe-OS.zip", "HallyCafe-OS", hally_files_HallyCafeOS)

# 2. hally-cafe.zip in public and wordpress-plugin
create_zip(f"{base_dir}/public/hally-cafe.zip", "hally-cafe", hally_files_hallycafe)
create_zip(f"{base_dir}/wordpress-plugin/hally-cafe.zip", "hally-cafe", hally_files_hallycafe)

print("All zips created successfully.")
