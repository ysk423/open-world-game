# Generates placeholder pixel art (tileset + player spritesheet) as a one-shot script.
# Replace with real pixel art / purchased assets later (see spec section 6.10).
#
# NOTE: keep this file's comments ASCII-only. Windows PowerShell 5.1 reads .ps1 files
# without a BOM using the system ANSI codepage (Shift-JIS on ja-JP Windows), and some
# UTF-8 byte sequences for kanji get misparsed as Shift-JIS, silently swallowing the
# newline right after the comment and eating the next line of code.
#
# Tile/sprite size is 32px (doubled from the original 16px placeholders) for higher
# visual detail. Rounded shapes use FillEllipse instead of stacked rectangles.
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$assetsDir = Join-Path $root "public\assets"
New-Item -ItemType Directory -Force -Path $assetsDir | Out-Null

$tileSize = 32

function Fill($gfx, $x, $y, $w, $h, $r, $gg, $b) {
    $brush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, $r, $gg, $b))
    $gfx.FillRectangle($brush, $x, $y, $w, $h)
    $brush.Dispose()
}

function FillOval($gfx, $x, $y, $w, $h, $r, $gg, $b) {
    $brush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, $r, $gg, $b))
    $gfx.FillEllipse($brush, $x, $y, $w, $h)
    $brush.Dispose()
}

# ---------- tileset (32x32 x 4 tiles: grass, path, water, rock) ----------
$tileset = New-Object System.Drawing.Bitmap ($tileSize * 4), $tileSize
$g = [System.Drawing.Graphics]::FromImage($tileset)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::None
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half

# tile0: grass
Fill $g 0 0 32 32 122 199 92
FillOval $g 4 4 5 4 100 178 74
FillOval $g 20 16 5 4 100 178 74
FillOval $g 10 24 5 4 100 178 74
FillOval $g 24 6 4 3 145 215 110
FillOval $g 6 20 4 3 145 215 110

# tile1: path
Fill $g 32 0 32 32 210 180 140
FillOval $g 36 8 6 4 190 160 120
FillOval $g 50 18 6 4 190 160 120
FillOval $g 42 24 5 3 190 160 120
FillOval $g 44 6 4 3 228 202 168

# tile2: water
Fill $g 64 0 32 32 74 144 217
Fill $g 68 6 12 2 130 190 240
Fill $g 80 18 12 2 130 190 240
Fill $g 70 24 10 2 130 190 240
FillOval $g 88 8 4 3 170 215 250

# tile3: rock (on grass background)
Fill $g 96 0 32 32 122 199 92
FillOval $g 102 12 20 16 100 100 100
FillOval $g 100 8 20 16 140 140 140
FillOval $g 104 10 10 6 170 170 170

$g.Dispose()
$tileset.Save((Join-Path $assetsDir "tileset.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$tileset.Dispose()

# ---------- player spritesheet (32x64 x 3 facings x 2 frames) ----------
# row0: down (front), row1: side (right-facing; left uses flipX), row2: up (back)
$fw = 32; $fh = 64
$sheet = New-Object System.Drawing.Bitmap ($fw * 2), ($fh * 3)
$g2 = [System.Drawing.Graphics]::FromImage($sheet)
$g2.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::None

$skin = @(245, 194, 138)
$shirt = @(91, 140, 222)
$hat = @(214, 80, 80)
$hair = @(120, 72, 48)
$pants = @(60, 60, 90)
$eye = @(40, 30, 30)

function DrawFrame($gfx, $ox, $oy, $facing, $step) {
    # head
    FillOval $gfx ($ox+8) ($oy+4) 16 14 $skin[0] $skin[1] $skin[2]
    # hat
    FillOval $gfx ($ox+7) ($oy+0) 18 8 $hat[0] $hat[1] $hat[2]
    # body (shirt)
    Fill $gfx ($ox+6) ($oy+18) 20 20 $shirt[0] $shirt[1] $shirt[2]

    # arms + hands
    Fill $gfx ($ox+2) ($oy+20) 5 14 $shirt[0] $shirt[1] $shirt[2]
    Fill $gfx ($ox+25) ($oy+20) 5 14 $shirt[0] $shirt[1] $shirt[2]
    FillOval $gfx ($ox+1) ($oy+32) 6 6 $skin[0] $skin[1] $skin[2]
    FillOval $gfx ($ox+25) ($oy+32) 6 6 $skin[0] $skin[1] $skin[2]

    if ($facing -eq "down") {
        FillOval $gfx ($ox+11) ($oy+9) 3 3 $eye[0] $eye[1] $eye[2]
        FillOval $gfx ($ox+18) ($oy+9) 3 3 $eye[0] $eye[1] $eye[2]
    } elseif ($facing -eq "up") {
        FillOval $gfx ($ox+7) ($oy+5) 18 8 $hair[0] $hair[1] $hair[2]
    } else {
        # side: draw a single eye (right-facing base; left uses flipX)
        FillOval $gfx ($ox+20) ($oy+9) 3 3 $eye[0] $eye[1] $eye[2]
    }

    # legs: alternate which leg is longer to fake a walk cycle
    if ($step -eq 0) {
        Fill $gfx ($ox+6) ($oy+36) 8 12 $pants[0] $pants[1] $pants[2]
        Fill $gfx ($ox+18) ($oy+36) 8 10 $pants[0] $pants[1] $pants[2]
    } else {
        Fill $gfx ($ox+6) ($oy+36) 8 10 $pants[0] $pants[1] $pants[2]
        Fill $gfx ($ox+18) ($oy+36) 8 12 $pants[0] $pants[1] $pants[2]
    }
}

DrawFrame $g2 0        0        "down" 0
DrawFrame $g2 $fw      0        "down" 1
DrawFrame $g2 0        $fh      "side" 0
DrawFrame $g2 $fw      $fh      "side" 1
DrawFrame $g2 0        ($fh*2)  "up"   0
DrawFrame $g2 $fw      ($fh*2)  "up"   1

$g2.Dispose()
$sheet.Save((Join-Path $assetsDir "player.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$sheet.Dispose()

# ---------- gathering point icons (32x32 x 3: wood, stone, herb) ----------
$gsheet = New-Object System.Drawing.Bitmap ($tileSize * 3), $tileSize
$g3 = [System.Drawing.Graphics]::FromImage($gsheet)
$g3.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::None

# frame0: wood (tree)
Fill $g3 12 20 8 10 120 72 48
FillOval $g3 4 2 24 20 60 140 70
FillOval $g3 8 6 10 8 85 165 95

# frame1: stone (ore rock, distinct from the plain obstacle rock: has yellow ore flecks)
FillOval $g3 34 8 24 20 150 150 150
FillOval $g3 38 10 12 6 175 175 175
FillOval $g3 40 18 4 4 224 196 64
FillOval $g3 52 14 4 4 224 196 64

# frame2: herb (bush)
FillOval $g3 66 10 24 18 84 178 96
FillOval $g3 70 12 12 8 110 200 120
FillOval $g3 74 18 4 4 230 120 150
FillOval $g3 84 22 4 4 230 200 90

$g3.Dispose()
$gsheet.Save((Join-Path $assetsDir "gathering.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$gsheet.Dispose()

# ---------- building icons (32x32 x 5: fence, well, flower_bed, signpost, storage_shed) ----------
$bsheet = New-Object System.Drawing.Bitmap ($tileSize * 5), $tileSize
$g4 = [System.Drawing.Graphics]::FromImage($bsheet)
$g4.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::None

# frame0: fence (horizontal planks on posts)
Fill $g4 2 20 4 10 100 72 48
Fill $g4 26 20 4 10 100 72 48
Fill $g4 0 12 32 5 140 100 66
Fill $g4 0 20 32 5 140 100 66

# frame1: well (stone ring with dark water center)
FillOval $g4 34 8 24 20 150 150 150
FillOval $g4 39 12 14 12 60 90 130
FillOval $g4 36 6 20 6 180 180 180

# frame2: flower_bed (dark soil with colorful flowers)
FillOval $g4 66 16 24 14 90 62 42
FillOval $g4 70 18 4 4 220 90 90
FillOval $g4 80 20 4 4 230 210 80
FillOval $g4 75 24 4 4 230 130 190
FillOval $g4 85 16 4 4 220 90 90

# frame3: signpost (post + plank sign)
Fill $g4 110 14 4 18 120 84 54
Fill $g4 100 6 24 10 196 164 120
Fill $g4 104 10 3 2 120 84 54
Fill $g4 114 10 3 2 120 84 54

# frame4: storage shed (small hut: roof + wall)
Fill $g4 130 16 24 12 170 130 90
Fill $g4 128 6 28 12 150 60 50
Fill $g4 138 20 8 8 90 62 42

$g4.Dispose()
$bsheet.Save((Join-Path $assetsDir "buildings.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$bsheet.Dispose()

# ---------- monster (32x32 x 1: small slime) ----------
$msheet = New-Object System.Drawing.Bitmap $tileSize, $tileSize
$g5 = [System.Drawing.Graphics]::FromImage($msheet)
$g5.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::None

FillOval $g5 8 22 16 6 90 30 100
FillOval $g5 6 8 20 18 150 60 160
FillOval $g5 10 10 10 6 180 90 190
FillOval $g5 11 16 4 4 250 250 250
FillOval $g5 19 16 4 4 250 250 250
FillOval $g5 12 17 2 2 20 20 20
FillOval $g5 20 17 2 2 20 20 20

$g5.Dispose()
$msheet.Save((Join-Path $assetsDir "monster.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$msheet.Dispose()

# ---------- npc (32x64 x 2: villager A, villager B) ----------
$nfw = 32; $nfh = 64
$nsheet = New-Object System.Drawing.Bitmap ($nfw * 2), $nfh
$g6 = [System.Drawing.Graphics]::FromImage($nsheet)
$g6.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::None

function DrawNpc($gfx, $ox, $skinColor, $hairColor, $shirtColor) {
    FillOval $gfx ($ox+8) 4 16 14 $skinColor[0] $skinColor[1] $skinColor[2]
    FillOval $gfx ($ox+7) 0 18 8 $hairColor[0] $hairColor[1] $hairColor[2]
    Fill $gfx ($ox+6) 18 20 20 $shirtColor[0] $shirtColor[1] $shirtColor[2]
    Fill $gfx ($ox+2) 20 5 14 $shirtColor[0] $shirtColor[1] $shirtColor[2]
    Fill $gfx ($ox+25) 20 5 14 $shirtColor[0] $shirtColor[1] $shirtColor[2]
    FillOval $gfx ($ox+1) 32 6 6 $skinColor[0] $skinColor[1] $skinColor[2]
    FillOval $gfx ($ox+25) 32 6 6 $skinColor[0] $skinColor[1] $skinColor[2]
    FillOval $gfx ($ox+11) 9 3 3 40 30 30
    FillOval $gfx ($ox+18) 9 3 3 40 30 30
    Fill $gfx ($ox+6) 36 8 12 90 74 58
    Fill $gfx ($ox+18) 36 8 12 90 74 58
}

$npcSkin = @(245, 194, 138)
DrawNpc $g6 0 $npcSkin @(110, 74, 46) @(90, 160, 90)
DrawNpc $g6 $nfw $npcSkin @(70, 48, 32) @(210, 150, 80)

$g6.Dispose()
$nsheet.Save((Join-Path $assetsDir "npc.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$nsheet.Dispose()

# ---------- farm plot (32x32 x 3: empty soil, growing sprout, ready crop) ----------
$fsheet = New-Object System.Drawing.Bitmap ($tileSize * 3), $tileSize
$g7 = [System.Drawing.Graphics]::FromImage($fsheet)
$g7.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::None

# frame0: empty tilled soil (furrows)
Fill $g7 0 0 32 32 122 199 92
Fill $g7 2 4 28 24 111 78 55
FillOval $g7 4 8 24 3 95 66 46
FillOval $g7 4 15 24 3 95 66 46
FillOval $g7 4 22 24 3 95 66 46

# frame1: growing (soil + small green sprouts)
Fill $g7 32 0 32 32 122 199 92
Fill $g7 34 4 28 24 111 78 55
FillOval $g7 38 12 4 10 70 150 80
FillOval $g7 48 10 4 12 70 150 80
FillOval $g7 56 12 4 10 70 150 80

# frame2: ready (soil + ripe orange crops)
Fill $g7 64 0 32 32 122 199 92
Fill $g7 66 4 28 24 111 78 55
FillOval $g7 69 12 8 10 235 140 40
FillOval $g7 80 10 8 12 235 140 40
FillOval $g7 90 12 6 10 235 140 40
FillOval $g7 71 13 3 3 90 160 70
FillOval $g7 82 11 3 3 90 160 70

$g7.Dispose()
$fsheet.Save((Join-Path $assetsDir "farm.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$fsheet.Dispose()

# ---------- animal (32x32 x 1: small rabbit) ----------
$asheet = New-Object System.Drawing.Bitmap $tileSize, $tileSize
$g8 = [System.Drawing.Graphics]::FromImage($asheet)
$g8.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::None

FillOval $g8 6 14 20 14 245 245 245
FillOval $g8 9 6 14 12 245 245 245
FillOval $g8 10 0 5 10 245 245 245
FillOval $g8 17 0 5 10 245 245 245
FillOval $g8 11 2 2 6 240 190 200
FillOval $g8 18 2 2 6 240 190 200
FillOval $g8 19 10 2 2 40 30 30
FillOval $g8 4 20 5 5 245 245 245

$g8.Dispose()
$asheet.Save((Join-Path $assetsDir "animal.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$asheet.Dispose()

# ---------- shop (32x32 x 1: small market stall) ----------
$shsheet = New-Object System.Drawing.Bitmap $tileSize, $tileSize
$g9 = [System.Drawing.Graphics]::FromImage($shsheet)
$g9.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::None

Fill $g9 4 20 24 8 170 130 90
Fill $g9 4 20 24 3 190 150 105
Fill $g9 4 10 3 12 120 84 54
Fill $g9 25 10 3 12 120 84 54
Fill $g9 2 4 28 8 210 70 70
Fill $g9 2 4 7 8 235 235 235
Fill $g9 16 4 7 8 235 235 235
FillOval $g9 2 10 28 4 160 50 50

$g9.Dispose()
$shsheet.Save((Join-Path $assetsDir "shop.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$shsheet.Dispose()

Write-Output "written: $assetsDir\tileset.png, $assetsDir\player.png, $assetsDir\gathering.png, $assetsDir\buildings.png, $assetsDir\monster.png, $assetsDir\npc.png, $assetsDir\farm.png, $assetsDir\animal.png, $assetsDir\shop.png"
