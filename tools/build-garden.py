"""Build an isolated release without MCP/debug tooling; ZIP uses POSIX names."""
from pathlib import Path
import argparse, re, shutil, subprocess, zipfile

p = argparse.ArgumentParser()
p.add_argument('--godot', required=True)
args = p.parse_args()
repo = Path(__file__).resolve().parents[1]
source = repo / 'games/godot'
stage = repo / 'dist/garden-source'
out = repo / 'dist/garden-gamepix'
stage.mkdir(parents=True, exist_ok=True)
out.mkdir(parents=True, exist_ok=True)
for name in ['main.gd', 'main.tscn', 'rules.gd', 'board.gd', 'tutorial_strip.gd']:
    target = stage / 'garden' / name
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source / 'garden' / name, target)
shutil.copytree(source / 'garden/fonts', stage / 'garden/fonts', dirs_exist_ok=True, ignore=shutil.ignore_patterns('*.import'))
shutil.copy2(source / 'garden/fonts/OFL.txt', out / 'index-font-license.txt')
shutil.copytree(source / 'garden/audio', stage / 'garden/audio', dirs_exist_ok=True, ignore=shutil.ignore_patterns('*.import'))
shutil.copytree(source / 'Sprites/textures', stage / 'Sprites/textures', dirs_exist_ok=True, ignore=shutil.ignore_patterns('*.import'))
shutil.copytree(source / 'addons/gpx-godot-plugin', stage / 'addons/gpx-godot-plugin', dirs_exist_ok=True)
project = (source / 'project.godot').read_text(encoding='utf-8-sig')
project = re.sub(r'^MCPRuntime=.*\n', '', project, flags=re.M)
project = re.sub(r'^GPX=.*$', 'GPX="*res://addons/gpx-godot-plugin/gpx.gd"', project, flags=re.M)
project = re.sub(r'^enabled=.*$', 'enabled=PackedStringArray()', project, flags=re.M)
(stage / 'project.godot').write_text(project, encoding='utf-8')
shutil.copy2(source / 'export_presets.cfg', stage / 'export_presets.cfg')
for command in [
    [args.godot, '--headless', '--path', str(stage), '--editor', '--import', '--quit'],
    [args.godot, '--headless', '--path', str(stage), '--export-release', 'GamePix', str(out / 'index.html')],
]:
    subprocess.run(command, check=True)
for name in ['index.html', 'index.js', 'index.wasm', 'index.pck']:
    assert (out / name).is_file(), name
archive = repo / 'dist/pawzzle-mochas-garden-gamepix.zip'
with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as z:
    for file in sorted(out.glob('index*')):
        if file.is_file(): z.write(file, file.name)
with zipfile.ZipFile(archive) as z:
    assert 'index.html' in z.namelist()
    assert all('\\' not in n for n in z.namelist())
print(f'Release ready: {archive} ({archive.stat().st_size:,} bytes)')
