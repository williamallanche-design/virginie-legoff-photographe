<#
  Découpe une vidéo (Kling ou autre) en séquence WebP pour le hero scrollé sur <canvas>.

    .\scripts\extract-hero-frames.ps1 -Video "C:\chemin\kling-ecrin-instant.mp4"
    .\scripts\extract-hero-frames.ps1 -Video ... -Frames 180
    .\scripts\extract-hero-frames.ps1 -Video ... -End 7.2      (ignore la fin, figée)

  Produit :
    public/hero/desktop/0000.webp …  1280 px de large, 16:9
    public/hero/mobile/0000.webp  …  720 px de large, recadré au centre en 4:5
    content/hero.json                manifeste lu au build (nombre d'images, dimensions)

  Pourquoi des images plutôt que la vidéo : un <video> doit décoder depuis la dernière image clé
  à chaque saut de currentTime, ce qui saccade au scroll. Des images déjà décodées se dessinent
  instantanément sur le canvas, à 60 ou 120 fps.
#>
param(
  [Parameter(Mandatory = $true)] [string] $Video,
  [int] $Frames = 120,
  [double] $Start = 0,
  [double] $End = 0   # 0 = jusqu'à la fin de la vidéo
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$heroDir = Join-Path $root "public/hero"

$inv = [Globalization.CultureInfo]::InvariantCulture
$total = [double]::Parse((& ffprobe -v error -show_entries format=duration -of csv=p=0 $Video), $inv)
if ($End -le 0 -or $End -gt $total) { $End = $total }
$duration = $End - $Start
$fps = [math]::Round($Frames / $duration, 4).ToString($inv)
$range = @("-ss", $Start.ToString($inv), "-to", $End.ToString($inv))

$sets = @(
  @{ Name = "desktop"; Filter = "fps=$fps,scale=1280:-2:flags=lanczos"; Quality = 58 },
  @{ Name = "mobile";  Filter = "fps=$fps,crop=ih*4/5:ih,scale=720:-2:flags=lanczos"; Quality = 55 }
)

$manifest = [ordered]@{ frames = 0 }
foreach ($set in $sets) {
  $dir = Join-Path $heroDir $set.Name
  if (Test-Path $dir) { Remove-Item -Recurse -Force $dir }
  New-Item -ItemType Directory -Force $dir | Out-Null

  # -quality : compromis netteté / poids (55-60 suffit : l’image bouge pendant le scrub)
  # -compression_level 6 : encodage plus lent, fichiers ~10 % plus légers
  & ffmpeg -hide_banner -loglevel error -y @range -i $Video `
    -vf $set.Filter -c:v libwebp -quality $set.Quality -compression_level 6 -preset photo `
    -start_number 0 (Join-Path $dir "%04d.webp")

  $files = Get-ChildItem $dir -Filter *.webp
  $size = (& ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 $files[0].FullName).Split(",")
  $manifest.frames = $files.Count
  $manifest[$set.Name] = [ordered]@{ width = [int]$size[0]; height = [int]$size[1] }
  $mb = [math]::Round(($files | Measure-Object Length -Sum).Sum / 1MB, 1)
  Write-Host "$($set.Name) : $($files.Count) images, $mb Mo"
}

$manifest | ConvertTo-Json | Set-Content -Encoding utf8 (Join-Path $root "content/hero.json")
Write-Host "Manifeste écrit dans content/hero.json"
