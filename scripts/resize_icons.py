import os
from PIL import Image
import sys

def resize_icon(input_path, output_dir):
    if not os.path.exists(input_path):
        print(f"Error: Input file '{input_path}' not found.")
        return

    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    try:
        with Image.open(input_path) as img:
            sizes = [16, 32, 48, 128, 256]
            for size in sizes:
                output_filename = f"icon{size}.png"
                output_path = os.path.join(output_dir, output_filename)
                
                # Resize using LANCZOS for high quality downsampling
                resized_img = img.resize((size, size), Image.Resampling.LANCZOS)
                resized_img.save(output_path, "PNG")
                print(f"Generated {output_path}")
                
    except Exception as e:
        print(f"Error processing image: {e}")

if __name__ == "__main__":
    # Base icon path (adjust if necessary)
    base_icon = r"d:\Projects\sarvam_extension\icons\icon.png"
    icons_dir = r"d:\Projects\sarvam_extension\icons"
    
    if len(sys.argv) > 1:
        base_icon = sys.argv[1]
        
    resize_icon(base_icon, icons_dir)
