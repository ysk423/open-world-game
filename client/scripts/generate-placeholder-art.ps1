# Generates placeholder pixel art (tileset + player spritesheet) as a one-shot script.
# Replace with real pixel art / purchased assets later (see spec section 6.10).
#
# NOTE: keep this file's comments ASCII-only. Windows PowerShell 5.1 reads .ps1 files
# without a BOM using the system ANSI codepage (Shift-JIS on ja-JP Windows), and some
# UTF-8 byte sequences for kanji get misparsed as Shift-JIS, silently swallowing the
# newline right after the comment and eating the next line of code.
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$assetsDir = Join-Path $root "public\assets"
New-Item -ItemType Directory -Force -Path $assetsDir | Out-Null

# ---------- tileset (16x16 x 4 tiles: grass, path, water, rock) ----------
$tileSize = 16
$tileset = New-Object System.Drawing.Bitmap ($tileSize * 4), $tileSize
$g = [System.Drawing.Graphics]::FromImage($tileset)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::None
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half

function Fill($gfx, $x, $y, $w, $h, $r, $gg, $b) {
    $brush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, $r, $gg, $b))
    $gfx.FillRectangle($brush, $x, $y, $w, $h)
    $brush.Dispose()
}

# tile0: grass
Fill $g 0 0 16 16 122 199 92
Fill $g 3 3 2 2 100 178 74
Fill $g 10 8 2 2 100 178 74
Fill $g 6 12 2 2 100 178 74

# tile1: path
Fill $g 16 0 16 16 210 180 140
Fill $g 18 4 3 2 190 160 120
Fill $g 24 9 3 2 190 160 120

# tile2: water
Fill $g 32 0 16 16 74 144 217
Fill $g 34 3 6 1 130 190 240
Fill $g 40 9 6 1 130 190 240

# tile3: rock (on grass background)
Fill $g 48 0 16 16 122 199 92
Fill $g 51 5 10 8 138 138 138
Fill $g 52 4 8 2 158 158 158

$g.Dispose()
$tileset.Save((Join-Path $assetsDir "tileset.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$tileset.Dispose()

# ---------- player spritesheet (16x32 x 3 facings x 2 frames) ----------
# row0: down (front), row1: side (right-facing; left uses flipX), row2: up (back)
$fw = 16; $fh = 32
$sheet = New-Object System.Drawing.Bitmap ($fw * 2), ($fh * 3)
$g2 = [System.Drawing.Graphics]::FromImage($sheet)
$g2.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::None

$skin = [System.Drawing.Color]::FromArgb(255, 245, 194, 138)
$shirt = [System.Drawing.Color]::FromArgb(255, 91, 140, 222)
$hat = [System.Drawing.Color]::FromArgb(255, 214, 80, 80)
$hair = [System.Drawing.Color]::FromArgb(255, 120, 72, 48)
$pants = [System.Drawing.Color]::FromArgb(255, 60, 60, 90)
$eye = [System.Drawing.Color]::FromArgb(255, 40, 30, 30)

function DrawFrame($gfx, $ox, $oy, $facing, $step) {
    $skinB = New-Object System.Drawing.SolidBrush $skin
    $shirtB = New-Object System.Drawing.SolidBrush $shirt
    $hatB = New-Object System.Drawing.SolidBrush $hat
    $hairB = New-Object System.Drawing.SolidBrush $hair
    $pantsB = New-Object System.Drawing.SolidBrush $pants
    $eyeB = New-Object System.Drawing.SolidBrush $eye

    # head
    $gfx.FillRectangle($skinB, $ox+4, $oy+2, 8, 7)
    # hat
    $gfx.FillRectangle($hatB, $ox+3, $oy+0, 10, 3)
    # body (shirt)
    $gfx.FillRectangle($shirtB, $ox+3, $oy+9, 10, 9)

    if ($facing -eq "down") {
        $gfx.FillRectangle($eyeB, $ox+6, $oy+5, 1, 1)
        $gfx.FillRectangle($eyeB, $ox+9, $oy+5, 1, 1)
    } elseif ($facing -eq "up") {
        $gfx.FillRectangle($hairB, $ox+4, $oy+3, 8, 3)
    } else {
        # side: draw a single eye (right-facing base; left uses flipX)
        $gfx.FillRectangle($eyeB, $ox+10, $oy+5, 1, 1)
    }

    # legs: alternate which leg is longer to fake a walk cycle
    if ($step -eq 0) {
        $gfx.FillRectangle($pantsB, $ox+3, $oy+18, 4, 6)
        $gfx.FillRectangle($pantsB, $ox+9, $oy+18, 4, 5)
    } else {
        $gfx.FillRectangle($pantsB, $ox+3, $oy+18, 4, 5)
        $gfx.FillRectangle($pantsB, $ox+9, $oy+18, 4, 6)
    }

    $skinB.Dispose(); $shirtB.Dispose(); $hatB.Dispose(); $hairB.Dispose(); $pantsB.Dispose(); $eyeB.Dispose()
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

Write-Output "written: $assetsDir\tileset.png, $assetsDir\player.png"
