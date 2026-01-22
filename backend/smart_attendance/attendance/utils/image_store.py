import os
import shutil
from datetime import timedelta
from django.utils import timezone
from django.conf import settings

WEEKDAY_FOLDERS = {
    "Sunday": "1sunday",
    "Monday": "2monday",
    "Tuesday": "3tuesday",
    "Wednesday": "4wednesday",
    "Thursday": "5thursday",
    "Friday": "6friday",
    "Saturday": "7saturday",
}

RETENTION_DAYS = 7

def _ensure_dir(path):
    os.makedirs(path, exist_ok=True)
    return path

def get_weekday_folder_for_date(dt=None):
    dt = dt or timezone.localdate()
    weekday_name = dt.strftime("%A")
    folder_name = WEEKDAY_FOLDERS.get(weekday_name, weekday_name.lower())
    return os.path.join(settings.MEDIA_ROOT, folder_name)

def _find_temp_image_for_roll(roll_no):
    """Search MEDIA_ROOT/temp and its subfolders for a file named <roll_no>.jpg.
    Return the path to the newest matching file if found, otherwise None.
    """
    temp_root = os.path.join(settings.MEDIA_ROOT, 'temp')
    candidates = []
    # direct file in temp
    direct = os.path.join(temp_root, f"{roll_no}.jpg")
    if os.path.isfile(direct):
        candidates.append(direct)

    # search immediate subdirectories (e.g. media/temp/5thrusday)
    if os.path.isdir(temp_root):
        for entry in os.listdir(temp_root):
            sub = os.path.join(temp_root, entry)
            if os.path.isdir(sub):
                p = os.path.join(sub, f"{roll_no}.jpg")
                if os.path.isfile(p):
                    candidates.append(p)

    if not candidates:
        return None

    # return the newest by modification time
    candidates.sort(key=lambda p: os.path.getmtime(p), reverse=True)
    return candidates[0]


def save_attendance_image_from_path(src_path, roll_no):
    """
    Copy src_path into media/<weekday_folder>/<roll_no>.jpg (overwrite)
    and also save an archived dated copy: <roll_no>_YYYY-MM-DD.jpg.
    If src_path does not exist or is None, search under MEDIA_ROOT/temp
    and its subfolders (e.g. media/temp/5thrusday) for <roll_no>.jpg.
    Then cleanup archived files older than RETENTION_DAYS.
    """
    # if src_path is missing or doesn't exist, try to find it in temp folders
    if not src_path or not os.path.isfile(src_path):
        found = _find_temp_image_for_roll(roll_no)
        if found:
            src_path = found
        else:
            raise FileNotFoundError(f"No temp image found for roll {roll_no}")

    dst_dir = _ensure_dir(get_weekday_folder_for_date())
    today = timezone.localdate().isoformat()
    main_dst = os.path.join(dst_dir, f"{roll_no}.jpg")
    archive_dst = os.path.join(dst_dir, f"{roll_no}_{today}.jpg")

    # Copy / overwrite main file
    shutil.copy2(src_path, main_dst)
    # Also keep a dated archive for retention / debugging
    shutil.copy2(src_path, archive_dst)

    # Cleanup: remove archived files older than RETENTION_DAYS
    now_ts = timezone.now().timestamp()
    retention_seconds = RETENTION_DAYS * 86400
    for fn in os.listdir(dst_dir):
        fp = os.path.join(dst_dir, fn)
        if not os.path.isfile(fp):
            continue
        # skip current main file
        if os.path.abspath(fp) == os.path.abspath(main_dst):
            continue
        try:
            mtime = os.path.getmtime(fp)
            if (now_ts - mtime) > retention_seconds:
                try:
                    os.remove(fp)
                except Exception:
                    pass
        except Exception:
            # ignore errors getting mtime
            pass

    return main_dst