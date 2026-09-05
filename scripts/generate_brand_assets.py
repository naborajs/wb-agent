"""
EDITH Brand Asset Generator
Extracts transparent, high-definition, theme-adaptive assets from the master FAVICON.png
and distributes them across the dashboard and backend filesystems.
"""

import os
import shutil
import numpy as np
from PIL import Image, ImageFilter, ImageOps

def create_brand_assets(src_path="FAVICON.png"):
    print(f"Loading master source image: {src_path}...")
    if not os.path.exists(src_path):
        raise FileNotFoundError(f"Source file {src_path} not found!")

    src = Image.open(src_path).convert("RGBA")
    arr = np.array(src, dtype=np.float32)
    H, W = arr.shape[:2]
    print(f"Master image size: {W}x{H}, channels: {arr.shape[2]}")

    # Ensure output directories exist
    os.makedirs("dashboard/public", exist_ok=True)
    os.makedirs("dashboard/app", exist_ok=True)
    os.makedirs("backend/app/assets", exist_ok=True)
    os.makedirs("docs/assets", exist_ok=True)

    # -------------------------------------------------------------
    # 1. Store Master Artwork in standard locations
    # -------------------------------------------------------------
    print("1. Storing master brand artwork...")
    src.save("dashboard/public/edith-master.png", "PNG", optimize=True)
    src.save("backend/app/assets/edith-master.png", "PNG", optimize=True)
    src.save("docs/assets/edith-master.png", "PNG", optimize=True)
    src.save("dashboard/public/logo.png", "PNG", optimize=True)
    src.save("backend/app/assets/logo.png", "PNG", optimize=True)

    # -------------------------------------------------------------
    # 2. Extract High-Precision Transparent Emblem
    # -------------------------------------------------------------
    print("2. Extracting transparent avatar emblem...")
    # Center of emblem in 1254x1254 canvas is (632, 428)
    # 564x564 box bounds: x in [350, 914], y in [146, 710]
    x1, x2 = 350, 914
    y1, y2 = 146, 710
    emblem = arr[y1:y2, x1:x2].copy()
    eH, eW = emblem.shape[:2]
    ccx, ccy = 282.0, 282.0
    radius = 247.0

    Y, X = np.ogrid[:eH, :eW]
    dist = np.sqrt((X - ccx)**2 + (Y - ccy)**2)
    rgb = emblem[:, :, :3]

    # Initialize alpha
    alpha = np.zeros((eH, eW), dtype=np.float32)

    # A. Celestial circle interior + anti-aliased edge
    circle_edge = np.clip((radius + 1.2 - dist) / 2.2, 0.0, 1.0)
    alpha = np.maximum(alpha, circle_edge)

    # B. Flowing hair (lower-left quadrant extending outside circle)
    hair_box = (Y >= 260) & (X <= 400) & (dist > radius - 2)
    hair_lum = 0.299 * rgb[:,:,0] + 0.587 * rgb[:,:,1] + 0.114 * rgb[:,:,2]
    hair_alpha = np.clip((hair_lum - 26.0) / (75.0 - 26.0), 0.0, 1.0)
    hair_alpha = hair_alpha * hair_alpha * (3.0 - 2.0 * hair_alpha)
    alpha[hair_box] = np.maximum(alpha[hair_box], hair_alpha[hair_box])

    # C. Glowing 4-point star on right rim
    star_box = (np.abs(Y - 282) <= 85) & (X >= 480) & (dist > radius - 2)
    star_lum = hair_lum
    star_alpha = np.clip((star_lum - 24.0) / (78.0 - 24.0), 0.0, 1.0)
    star_alpha = star_alpha * star_alpha * (3.0 - 2.0 * star_alpha)
    alpha[star_box] = np.maximum(alpha[star_box], star_alpha[star_box])

    # D. Edge de-fringing to eliminate dark halos on light backgrounds
    clean_rgb = rgb.copy()
    edge_pixels = (alpha > 0.02) & (alpha < 0.98) & (dist > radius - 6)
    boost = (1.0 - alpha[edge_pixels, None]) * 0.45
    clean_rgb[edge_pixels] = np.clip(
        clean_rgb[edge_pixels] + boost * np.array([45.0, 90.0, 155.0]),
        0.0, 255.0
    )

    emblem_rgba = np.dstack([clean_rgb, alpha * 255.0]).astype(np.uint8)
    emblem_img = Image.fromarray(emblem_rgba)

    # Resize to 512x512 with high quality Lanczos resampling
    emblem_512 = emblem_img.resize((512, 512), Image.Resampling.LANCZOS)
    emblem_512.save("dashboard/public/logo-icon.png", "PNG", optimize=True)
    emblem_512.save("backend/app/assets/logo-icon.png", "PNG", optimize=True)
    emblem_512.save("docs/assets/logo-icon.png", "PNG", optimize=True)
    print("  -> Saved dashboard/public/logo-icon.png (512x512 transparent)")

    # -------------------------------------------------------------
    # 3. Generate Badge Variant for Tiny Icons (32px to 64px)
    # -------------------------------------------------------------
    print("3. Generating cosmic badge variant...")
    # Cosmic dark glass backing circle with subtle cyan ring
    badge = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
    badge_arr = np.zeros((512, 512, 4), dtype=np.uint8)
    by, bx = np.ogrid[:512, :512]
    bdist = np.sqrt((bx - 256)**2 + (by - 256)**2)
    
    # Dark cosmic backing inside radius 248
    inside_badge = bdist <= 248
    badge_arr[inside_badge, 0] = 8    # R
    badge_arr[inside_badge, 1] = 12   # G
    badge_arr[inside_badge, 2] = 24   # B
    badge_arr[inside_badge, 3] = 230  # Alpha
    
    # Glowing rim border
    rim = (bdist >= 244) & (bdist <= 250)
    badge_arr[rim, 0] = 56   # R cyan
    badge_arr[rim, 1] = 189  # G
    badge_arr[rim, 2] = 248  # B
    badge_arr[rim, 3] = 240
    
    badge_base = Image.fromarray(badge_arr)
    # Paste emblem centered
    badge_base.paste(emblem_512, (0, 0), emblem_512)
    badge_base.save("dashboard/public/logo-icon-badge.png", "PNG", optimize=True)
    print("  -> Saved dashboard/public/logo-icon-badge.png")

    # -------------------------------------------------------------
    # 4. Generate Full Transparent Logo for Dark Backgrounds
    # -------------------------------------------------------------
    print("4. Generating full transparent logo for dark mode...")
    full_rgb = arr[:, :, :3]
    full_lum = 0.299 * full_rgb[:,:,0] + 0.587 * full_rgb[:,:,1] + 0.114 * full_rgb[:,:,2]

    # Full mask
    full_alpha = np.zeros((H, W), dtype=np.float32)

    # A. Place emblem alpha
    full_alpha[y1:y2, x1:x2] = alpha

    # B. Text regions:
    # 1. "EDITH" text: y in [735, 840], x in [220, 1035]
    edith_box = (slice(735, 840), slice(220, 1035))
    edith_lum = full_lum[edith_box]
    edith_alpha = np.clip((edith_lum - 22.0) / (70.0 - 22.0), 0.0, 1.0)
    edith_alpha = edith_alpha * edith_alpha * (3.0 - 2.0 * edith_alpha)
    full_alpha[edith_box] = np.maximum(full_alpha[edith_box], edith_alpha)

    # 2. Subtitle 1 ("MORE CONVERSATIONS. REAL OPPORTUNITIES."): y in [850, 885], x in [210, 1040]
    sub1_box = (slice(850, 885), slice(210, 1040))
    sub1_lum = full_lum[sub1_box]
    sub1_alpha = np.clip((sub1_lum - 16.0) / (55.0 - 16.0), 0.0, 1.0)
    sub1_alpha = sub1_alpha * sub1_alpha * (3.0 - 2.0 * sub1_alpha)
    full_alpha[sub1_box] = np.maximum(full_alpha[sub1_box], sub1_alpha)

    # 3. Divider: y in [965, 995], x in [550, 700]
    div_box = (slice(965, 995), slice(550, 700))
    div_lum = full_lum[div_box]
    div_alpha = np.clip((div_lum - 14.0) / (50.0 - 14.0), 0.0, 1.0)
    full_alpha[div_box] = np.maximum(full_alpha[div_box], div_alpha)

    # 4. Subtitle 2 ("YOUR AI SALES ASSISTANT THAT WORKS FOR YOU"): y in [1025, 1090], x in [310, 940]
    sub2_box = (slice(1025, 1090), slice(310, 940))
    sub2_lum = full_lum[sub2_box]
    sub2_alpha = np.clip((sub2_lum - 14.0) / (50.0 - 14.0), 0.0, 1.0)
    sub2_alpha = sub2_alpha * sub2_alpha * (3.0 - 2.0 * sub2_alpha)
    full_alpha[sub2_box] = np.maximum(full_alpha[sub2_box], sub2_alpha)

    # De-fringing on full image
    full_clean_rgb = full_rgb.copy()
    edge_mask = (full_alpha > 0.02) & (full_alpha < 0.98)
    full_boost = (1.0 - full_alpha[edge_mask, None]) * 0.4
    full_clean_rgb[edge_mask] = np.clip(
        full_clean_rgb[edge_mask] + full_boost * np.array([40.0, 80.0, 140.0]),
        0.0, 255.0
    )

    logo_trans_rgba = np.dstack([full_clean_rgb, full_alpha * 255.0]).astype(np.uint8)
    logo_trans_img = Image.fromarray(logo_trans_rgba)
    logo_trans_img.save("dashboard/public/logo-transparent.png", "PNG", optimize=True)
    logo_trans_img.save("docs/assets/logo-transparent.png", "PNG", optimize=True)
    print("  -> Saved dashboard/public/logo-transparent.png (1254x1254)")

    # -------------------------------------------------------------
    # 5. Generate Full Logo for Light / White Backgrounds
    # -------------------------------------------------------------
    print("5. Generating high-contrast light theme logo...")
    # For white theme, recolor the text elements from white/lavender to deep slate #0F172A,
    # while keeping the vibrant cyan star dot over the "i" and the celestial avatar!
    light_rgb = full_clean_rgb.copy()

    # The star dot over the 'i' is located at y in [705, 745], x in [672, 700]
    star_dot_mask = np.zeros((H, W), dtype=bool)
    star_dot_mask[705:745, 672:700] = True

    # Text areas to darken for light mode:
    # EDITH lettering (excluding star dot), Subtitle 1, Divider, Subtitle 2
    text_regions_mask = np.zeros((H, W), dtype=bool)
    text_regions_mask[735:840, 220:1035] = True
    text_regions_mask[850:885, 210:1040] = True
    text_regions_mask[965:995, 550:700] = True
    text_regions_mask[1025:1090, 310:940] = True
    text_regions_mask = text_regions_mask & (~star_dot_mask)

    # In text regions with active alpha, transform color to deep slate #0F172A
    darken_targets = text_regions_mask & (full_alpha > 0.05)
    
    # Deep slate color #0F172A = (15, 23, 42)
    slate_color = np.array([15.0, 23.0, 42.0], dtype=np.float32)
    light_rgb[darken_targets] = slate_color

    # Subtitles in slightly softer charcoal slate #334155 = (51, 65, 85)
    subtitles_mask = (np.zeros((H, W), dtype=bool))
    subtitles_mask[850:885, 210:1040] = True
    subtitles_mask[1025:1090, 310:940] = True
    sub_targets = subtitles_mask & (full_alpha > 0.05)
    light_rgb[sub_targets] = np.array([51.0, 65.0, 85.0], dtype=np.float32)

    # Brighten the star dot on the 'i' with electric cyan/neon glow for pop
    star_dot_targets = star_dot_mask & (full_alpha > 0.1)
    light_rgb[star_dot_targets] = np.array([14.0, 165.0, 233.0], dtype=np.float32)

    logo_light_rgba = np.dstack([light_rgb, full_alpha * 255.0]).astype(np.uint8)
    logo_light_img = Image.fromarray(logo_light_rgba)
    logo_light_img.save("dashboard/public/logo-light.png", "PNG", optimize=True)
    logo_light_img.save("docs/assets/logo-light.png", "PNG", optimize=True)
    print("  -> Saved dashboard/public/logo-light.png (Light theme high-contrast)")

    # -------------------------------------------------------------
    # 6. Generate Multi-Resolution Favicon (.ico)
    # -------------------------------------------------------------
    print("6. Generating multi-resolution favicon.ico...")
    # Use the badge version for smaller resolutions (16, 32, 48) so it is clear and distinct,
    # and the pure transparent emblem for 64, 128, 256.
    ico_sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    ico_images = []
    for s in ico_sizes:
        if s[0] <= 48:
            resized = badge_base.resize(s, Image.Resampling.LANCZOS)
        else:
            resized = emblem_512.resize(s, Image.Resampling.LANCZOS)
        ico_images.append(resized)

    # Save favicon.ico with all resolutions embedded
    ico_images[0].save(
        "dashboard/public/favicon.ico",
        format="ICO",
        sizes=ico_sizes,
        append_images=ico_images[1:],
    )
    print("  -> Saved dashboard/public/favicon.ico with 6 embedded resolutions")

    # -------------------------------------------------------------
    # 7. Generate Next.js App Router Icons & Apple Touch Icons
    # -------------------------------------------------------------
    print("7. Generating Apple Touch Icon and Next.js icon.png...")
    apple_180 = badge_base.resize((180, 180), Image.Resampling.LANCZOS)
    apple_180.save("dashboard/public/apple-touch-icon.png", "PNG", optimize=True)
    apple_180.save("dashboard/app/apple-icon.png", "PNG", optimize=True)

    icon_32 = badge_base.resize((32, 32), Image.Resampling.LANCZOS)
    icon_32.save("dashboard/app/icon.png", "PNG", optimize=True)
    print("  -> Saved dashboard/public/apple-touch-icon.png & dashboard/app/icon.png")

    # -------------------------------------------------------------
    # 8. Create Composite Samples for Verification
    # -------------------------------------------------------------
    print("8. Creating white and black theme test composites...")
    white_canvas = Image.new("RGBA", (1254, 1254), (248, 248, 250, 255))
    white_canvas.paste(logo_light_img, (0, 0), logo_light_img)
    white_canvas.save("docs/assets/preview-light-theme.png", "PNG")

    dark_canvas = Image.new("RGBA", (1254, 1254), (7, 7, 11, 255))
    dark_canvas.paste(logo_trans_img, (0, 0), logo_trans_img)
    dark_canvas.save("docs/assets/preview-dark-theme.png", "PNG")

    print("\nAll brand assets generated and placed successfully!")

if __name__ == "__main__":
    create_brand_assets()
