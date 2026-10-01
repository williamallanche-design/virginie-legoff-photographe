<#
  Séquence provisoire du hero, en attendant la vidéo Kling « L'Écrin et l'Instant ».
  Trois photos de Virginie montées en un seul plan : la plage au couchant (l'écrin),
  un passage à travers l'écume, puis le cœur tracé dans le sable (l'instant).

    .\scripts\make-hero-placeholder.ps1
#>
param(
  [string] $Source = "C:/Users/Utilisateur/Downloads/virginie-legoof-photographe"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$tmp = Join-Path $env:TEMP "vl-hero-placeholder.mp4"

$a = Join-Path $Source "Coucher de soleil Copyright/Reflets entre ciel et mer.jpg"
$b = Join-Path $Source "Séries Mer & Ciel copyright/La vague.jpg"
$c = Join-Path $Source "Coeur.jpg"

# Chaque photo : recadrage 16:9 puis lente avancée (zoompan) sur 4 s à 30 fps.
# Passage 1 → 2 en fondu au blanc (l'écume), 2 → 3 en fondu simple.
$push = "scale=3840:-2,crop=3840:2160,zoompan=z='{0}+{1}*on':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=120:s=1920x1080:fps=30,setsar=1"
$graph = @(
  "[0:v]$($push -f '1', '0.0018')[a]",
  "[1:v]$($push -f '1.08', '0.0014')[b]",
  "[2:v]$($push -f '1', '0.0020')[c]",
  "[a][b]xfade=transition=fadewhite:duration=1.4:offset=2.6[ab]",
  "[ab][c]xfade=transition=fade:duration=1.4:offset=5.2,format=yuv420p[v]"
) -join ";"

& ffmpeg -hide_banner -loglevel error -y -i $a -i $b -i $c -filter_complex $graph -map "[v]" -c:v libx264 -crf 16 -preset slow $tmp
& (Join-Path $PSScriptRoot "extract-hero-frames.ps1") -Video $tmp -Frames 120
Remove-Item $tmp
