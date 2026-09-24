import cv2
import numpy as np
import os
from PIL import Image

def extract():
    video_path = r'd:\portfolio\Character_tracking_cursor_animation_1080p_20260923123226.mp4'
    frames_dir = r'd:\portfolio\public\frames'
    os.makedirs(frames_dir, exist_ok=True)
    os.makedirs(r'd:\portfolio\public', exist_ok=True)

    print("Opening video:", video_path)
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise RuntimeError("Failed to open video file")

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    print(f"Total frames in video: {total_frames}")

    all_frames = []
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        all_frames.append(frame)
    cap.release()

    print(f"Read {len(all_frames)} frames successfully.")

    # Detect exact background color from 4 corners of multiple frames
    corner_colors = []
    for f in [all_frames[0], all_frames[50], all_frames[100], all_frames[150], all_frames[200], all_frames[235]]:
        corner = f[0:20, 0:20]
        b, g, r = corner.mean(axis=(0, 1))
        corner_colors.append((r, g, b))
    avg_r = np.mean([c[0] for c in corner_colors])
    avg_g = np.mean([c[1] for c in corner_colors])
    avg_b = np.mean([c[2] for c in corner_colors])
    hex_color = f"#{int(round(avg_r)):02x}{int(round(avg_g)):02x}{int(round(avg_b)):02x}"
    print(f"Detected Background Hex: {hex_color} (R:{avg_r:.1f}, G:{avg_g:.1f}, B:{avg_b:.1f})")

    # Center neutral frame (direct eye contact)
    center_frame_idx = 235
    center_bgr = all_frames[center_frame_idx]
    center_rgb = cv2.cvtColor(center_bgr, cv2.COLOR_BGR2RGB)
    center_pil = Image.fromarray(center_rgb)
    center_path = os.path.join(r'd:\portfolio\public', 'center.webp')
    center_frames_path = os.path.join(frames_dir, 'center.webp')
    center_pil.save(center_path, 'WEBP', quality=94, method=6)
    center_pil.save(center_frames_path, 'WEBP', quality=94, method=6)
    print(f"Saved center.webp from frame {center_frame_idx} -> {center_path}")

    # Keyframes corresponding to compass angles in degrees:
    # 0° (Right): 80
    # 45° (Down-Right): 105
    # 90° (Down): 130
    # 135° (Down-Left): 157
    # 180° (Left): 180
    # 225° (Up-Left): 205
    # 270° (Up): 220 (and 28)
    # 315° (Up-Right): 55
    # 360° (Right): 80
    
    # Piecewise mapping:
    # Angle in degrees [0, 360) -> frame index
    def angle_to_video_frame(angle_deg):
        angle = angle_deg % 360.0
        if 0.0 <= angle < 45.0:
            t = angle / 45.0
            return 80.0 + t * (105.0 - 80.0)
        elif 45.0 <= angle < 90.0:
            t = (angle - 45.0) / 45.0
            return 105.0 + t * (130.0 - 105.0)
        elif 90.0 <= angle < 135.0:
            t = (angle - 90.0) / 45.0
            return 130.0 + t * (157.0 - 130.0)
        elif 135.0 <= angle < 180.0:
            t = (angle - 135.0) / 45.0
            return 157.0 + t * (180.0 - 157.0)
        elif 180.0 <= angle < 225.0:
            t = (angle - 180.0) / 45.0
            return 180.0 + t * (205.0 - 180.0)
        elif 225.0 <= angle < 270.0:
            t = (angle - 225.0) / 45.0
            return 205.0 + t * (220.0 - 205.0)
        elif 270.0 <= angle < 315.0:
            t = (angle - 270.0) / 45.0
            return 28.0 + t * (55.0 - 28.0)
        else: # 315.0 <= angle < 360.0
            t = (angle - 315.0) / 45.0
            return 55.0 + t * (80.0 - 55.0)

    num_frames = 64
    step_deg = 360.0 / num_frames
    print(f"Extracting {num_frames} frames (each {step_deg:.3f}° apart)...")

    for i in range(num_frames):
        angle_deg = i * step_deg
        raw_v_frame = angle_to_video_frame(angle_deg)
        f_idx = int(round(raw_v_frame))
        f_idx = max(0, min(f_idx, len(all_frames) - 1))
        
        frame_bgr = all_frames[f_idx]
        frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
        pil_img = Image.fromarray(frame_rgb)
        
        filename = f"frame_{i:02d}.webp"
        out_path = os.path.join(frames_dir, filename)
        pil_img.save(out_path, 'WEBP', quality=92, method=6)
        if i % 8 == 0 or i == num_frames - 1:
            print(f"  Frame {i:02d}: angle={angle_deg:5.1f}°, video_frame={f_idx:3d} -> {filename}")

    # Also copy or link character.mp4 into public/
    public_mp4 = r'd:\portfolio\public\character.mp4'
    if not os.path.exists(public_mp4):
        import shutil
        shutil.copyfile(video_path, public_mp4)
        print("Copied video to public/character.mp4")

    print("\nAll frames successfully extracted!")

if __name__ == '__main__':
    extract()
