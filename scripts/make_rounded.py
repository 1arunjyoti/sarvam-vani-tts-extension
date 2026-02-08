from PIL import Image, ImageDraw, ImageOps
import sys
import os

def make_rounded(input_path, output_path, radius_ratio=0.5):
    try:
        img = Image.open(input_path).convert("RGBA")
        
        # Calculate radius size based on the shorter side
        radius = int(min(img.size) * radius_ratio)
        
        # Create a mask for rounded corners
        mask = Image.new('L', img.size, 0)
        draw = ImageDraw.Draw(mask)
        
        # Draw a filled rounded rectangle on the mask
        # standard PIL compatible way for rounded rect
        draw.rounded_rectangle([(0, 0), img.size], radius=radius, fill=255)
        
        # Apply the mask to the image
        output = img.copy()
        output.putalpha(mask)
        
        # Save the result
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        output.save(output_path)
        print(f"Created rounded icon: {output_path} (Radius: {radius}px)")
        
    except Exception as e:
        print(f"Error processing {input_path}: {e}")

if __name__ == "__main__":
    # Default paths
    input_file = r"d:\Projects\sarvam_extension\assets\icon_new.png" 
    output_file = r"d:\Projects\sarvam_extension\assets\icon_rounded.png"
    
    if len(sys.argv) > 1:
        input_file = sys.argv[1]
    if len(sys.argv) > 2:
        output_file = sys.argv[2]
        
    if os.path.exists(input_file):
        make_rounded(input_file, output_file)
    else:
        print(f"Input file not found: {input_file}")
        # fallback try looking in icons/
        fallback = r"d:\Projects\sarvam_extension\icons\icon.png"
        if os.path.exists(fallback):
             print(f"Trying fallback: {fallback}")
             make_rounded(fallback, "icons/icon_rounded.png")
