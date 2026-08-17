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
#
# Shapes use a simple 3-layer "outline -> fill -> highlight" trick (see FillOvalShaded /
# FillRectShaded below) to fake volume/depth without real lighting, since
# SmoothingMode stays None everywhere for crisp, non-antialiased pixel art. The outline
# is a multiplicatively darkened copy of the fill color (not a fixed subtraction), so it
# reads as a clear rim on both light and dark base colors.
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

function FillOvalAlpha($gfx, $x, $y, $w, $h, $r, $gg, $b, $a) {
    $brush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb($a, $r, $gg, $b))
    $gfx.FillEllipse($brush, $x, $y, $w, $h)
    $brush.Dispose()
}

function ShadeChannel($v, $factor) {
    return [Math]::Max(0, [Math]::Min(255, [Math]::Floor($v * $factor)))
}

# Rounded shape with a dark rim, flat fill, and a soft highlight patch for a "puffy" 3D look.
function FillOvalShaded($gfx, $x, $y, $w, $h, $r, $gg, $b) {
    $sr = ShadeChannel $r 0.42
    $sg = ShadeChannel $gg 0.42
    $sb = ShadeChannel $b 0.42
    FillOval $gfx ($x - 1.4) ($y - 1.4) ($w + 2.8) ($h + 2.8) $sr $sg $sb
    FillOval $gfx $x $y $w $h $r $gg $b
    $hlBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(100, 255, 255, 255))
    $hlW = [Math]::Max(2, [Math]::Floor($w * 0.4))
    $hlH = [Math]::Max(2, [Math]::Floor($h * 0.32))
    $gfx.FillEllipse($hlBrush, ($x + $w * 0.14), ($y + $h * 0.12), $hlW, $hlH)
    $hlBrush.Dispose()
}

# Rectangular shape with a bottom shadow strip and a top highlight strip for a beveled look.
function FillRectShaded($gfx, $x, $y, $w, $h, $r, $gg, $b) {
    $sr = ShadeChannel $r 0.42
    $sg = ShadeChannel $gg 0.42
    $sb = ShadeChannel $b 0.42
    Fill $gfx ($x - 1) ($y - 1) ($w + 2) ($h + 3) $sr $sg $sb
    Fill $gfx $x $y $w $h $r $gg $b
    $hlBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(85, 255, 255, 255))
    $hlH = [Math]::Max(1, [Math]::Floor($h * 0.3))
    $gfx.FillRectangle($hlBrush, $x, $y, $w, $hlH)
    $hlBrush.Dispose()
}

# A soft dropped shadow under a character/creature, drawn before the body so it peeks out at the edges.
function DrawGroundShadow($gfx, $cx, $footY, $w, $h) {
    FillOvalAlpha $gfx ($cx - $w / 2) ($footY - $h / 2) $w $h 0 0 0 85
}

# ---------- tileset (32x32 x 5 tiles: grass, path, water, rock, bridge) ----------
$tileset = New-Object System.Drawing.Bitmap ($tileSize * 5), $tileSize
$g = [System.Drawing.Graphics]::FromImage($tileset)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::None
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half

# tile0: grass (base + darker/lighter clump variation + blade streaks + tiny flowers)
Fill $g 0 0 32 32 102 182 76
FillOval $g 2 2 9 7 90 168 64
FillOval $g 18 14 9 7 90 168 64
FillOval $g 8 22 9 7 90 168 64
FillOval $g 22 4 7 5 134 206 96
FillOval $g 4 18 7 5 134 206 96
FillOval $g 16 26 6 4 134 206 96
Fill $g 6 8 1 5 78 150 56
Fill $g 14 4 1 4 78 150 56
Fill $g 26 20 1 5 78 150 56
Fill $g 20 24 1 4 78 150 56
FillOval $g 12 12 2 2 235 220 90
FillOval $g 27 8 2 2 235 235 235

# tile1: path (base + pebble shading + edge wear + tiny cracks)
Fill $g 32 0 32 32 199 168 128
FillOval $g 36 8 7 5 178 148 108
FillOval $g 50 18 7 5 178 148 108
FillOval $g 42 24 6 4 178 148 108
FillOval $g 45 6 5 4 220 194 156
Fill $g 32 0 32 2 214 186 148
Fill $g 32 30 32 2 168 138 100
Fill $g 40 14 6 1 168 138 100
Fill $g 56 22 5 1 168 138 100

# tile2: water (banded gradient + ripple highlights + darker deep patches)
Fill $g 64 0 32 32 52 118 194
Fill $g 64 0 32 10 72 146 224
Fill $g 64 22 32 10 42 100 168
FillOvalAlpha $g 88 4 10 8 20 60 110 90
FillOvalAlpha $g 68 20 10 8 20 60 110 70
Fill $g 68 6 12 2 156 210 248
Fill $g 80 18 12 2 156 210 248
Fill $g 70 24 10 2 122 184 230
FillOval $g 88 8 4 3 198 230 252
FillOval $g 72 14 3 2 198 230 252
FillOval $g 78 27 3 2 198 230 252

# tile3: rock (on grass background, shaded boulder cluster with cracks)
Fill $g 96 0 32 32 102 182 76
FillOval $g 96 2 9 7 90 168 64
FillOval $g 118 20 8 6 134 206 96
FillOvalShaded $g 102 12 20 16 104 104 104
FillOvalShaded $g 100 8 20 16 148 148 148
FillOval $g 104 10 10 6 184 184 184
Fill $g 108 14 1 6 96 96 96
Fill $g 114 12 1 5 96 96 96

# tile4: bridge (wood planks laid over water, water peeking through the gaps)
Fill $g 128 0 32 32 52 118 194
Fill $g 128 3 32 7 178 138 96
Fill $g 128 13 32 7 190 148 104
Fill $g 128 23 32 7 178 138 96
Fill $g 128 3 32 2 206 166 120
Fill $g 128 13 32 2 216 176 128
Fill $g 128 23 32 2 206 166 120
Fill $g 130 2 2 26 100 68 42
Fill $g 130 12 2 26 100 68 42
Fill $g 130 22 2 26 100 68 42
FillOvalAlpha $g 133 5 3 2 90 60 30 120
FillOvalAlpha $g 150 25 3 2 90 60 30 120

$g.Dispose()
$tileset.Save((Join-Path $assetsDir "tileset.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$tileset.Dispose()

# ---------- player spritesheet (32x64 x 3 facings x 2 frames) ----------
# row0: down (front), row1: side (right-facing; left uses flipX), row2: up (back)
$fw = 32; $fh = 64
$sheet = New-Object System.Drawing.Bitmap ($fw * 2), ($fh * 3)
$g2 = [System.Drawing.Graphics]::FromImage($sheet)
$g2.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::None
$g2.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half

$skin = @(245, 194, 138)
$shirt = @(78, 128, 214)
$hat = @(224, 84, 84)
$hair = @(120, 72, 48)
$pants = @(54, 54, 84)
$eye = @(40, 30, 30)
$boot = @(90, 62, 40)
$belt = @(70, 46, 28)

function DrawFrame($gfx, $ox, $oy, $facing, $step) {
    # Chunky "big head" DQ-ish proportions, shaded for volume and grounded with a soft shadow.
    DrawGroundShadow $gfx ($ox+16) ($oy+50) 18 5

    # legs (drawn first so the body/hat can overlap their tops slightly)
    if ($step -eq 0) {
        FillRectShaded $gfx ($ox+8) ($oy+37) 7 11 $boot[0] $boot[1] $boot[2]
        FillRectShaded $gfx ($ox+17) ($oy+37) 7 9 $boot[0] $boot[1] $boot[2]
    } else {
        FillRectShaded $gfx ($ox+8) ($oy+37) 7 9 $boot[0] $boot[1] $boot[2]
        FillRectShaded $gfx ($ox+17) ($oy+37) 7 11 $boot[0] $boot[1] $boot[2]
    }
    Fill $gfx ($ox+8) ($oy+30) 7 8 $pants[0] $pants[1] $pants[2]
    Fill $gfx ($ox+17) ($oy+30) 7 8 $pants[0] $pants[1] $pants[2]

    # body (shirt) + belt line
    FillRectShaded $gfx ($ox+8) ($oy+21) 16 16 $shirt[0] $shirt[1] $shirt[2]
    Fill $gfx ($ox+8) ($oy+34) 16 2 $belt[0] $belt[1] $belt[2]

    # arms + hands
    FillRectShaded $gfx ($ox+4) ($oy+23) 5 12 $shirt[0] $shirt[1] $shirt[2]
    FillRectShaded $gfx ($ox+23) ($oy+23) 5 12 $shirt[0] $shirt[1] $shirt[2]
    FillOvalShaded $gfx ($ox+3) ($oy+33) 6 6 $skin[0] $skin[1] $skin[2]
    FillOvalShaded $gfx ($ox+23) ($oy+33) 6 6 $skin[0] $skin[1] $skin[2]

    # head (bigger, rounder, shaded for volume)
    FillOvalShaded $gfx ($ox+6) ($oy+3) 20 17 $skin[0] $skin[1] $skin[2]
    # hat (wider brim to match the bigger head; sits a bit higher so the brim doesn't crowd the eyes)
    FillOvalShaded $gfx ($ox+4) ($oy-3) 24 10 $hat[0] $hat[1] $hat[2]
    FillOvalShaded $gfx ($ox+12) ($oy-4) 8 8 $hat[0] $hat[1] $hat[2]
    # rosy cheeks for a cuter look
    if ($facing -ne "up") {
        FillOval $gfx ($ox+7) ($oy+13) 3 2 240 150 150
        FillOval $gfx ($ox+22) ($oy+13) 3 2 240 150 150
    }

    if ($facing -eq "down") {
        FillOval $gfx ($ox+11) ($oy+10) 3 3 $eye[0] $eye[1] $eye[2]
        FillOval $gfx ($ox+18) ($oy+10) 3 3 $eye[0] $eye[1] $eye[2]
    } elseif ($facing -eq "up") {
        FillOvalShaded $gfx ($ox+5) ($oy+4) 22 10 $hair[0] $hair[1] $hair[2]
    } else {
        # side: draw a single eye (right-facing base; left uses flipX)
        FillOval $gfx ($ox+21) ($oy+10) 3 3 $eye[0] $eye[1] $eye[2]
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
$g3.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half

# frame0: wood (tree, shaded trunk + two-tone shaded canopy)
DrawGroundShadow $g3 16 29 16 4
FillRectShaded $g3 12 20 8 10 110 66 44
FillOvalShaded $g3 4 2 24 20 50 126 60
FillOval $g3 8 6 10 8 92 172 100
FillOval $g3 16 4 6 5 112 190 118

# frame1: stone (ore rock, distinct from the plain obstacle rock: has yellow ore flecks)
DrawGroundShadow $g3 46 27 20 4
FillOvalShaded $g3 34 8 24 20 138 138 138
FillOval $g3 38 10 12 6 175 175 175
FillOval $g3 40 18 4 4 224 196 64
FillOval $g3 52 14 4 4 224 196 64

# frame2: herb (bush, shaded, extra berries)
DrawGroundShadow $g3 78 29 20 4
FillOvalShaded $g3 66 10 24 18 74 164 86
FillOval $g3 70 12 12 8 112 202 122
FillOval $g3 74 18 4 4 230 120 150
FillOval $g3 84 22 4 4 230 200 90
FillOval $g3 80 14 3 3 230 120 150

$g3.Dispose()
$gsheet.Save((Join-Path $assetsDir "gathering.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$gsheet.Dispose()

# ---------- building icons (32x32 x 6: fence, well, flower_bed, signpost, storage_shed, rock) ----------
$bsheet = New-Object System.Drawing.Bitmap ($tileSize * 6), $tileSize
$g4 = [System.Drawing.Graphics]::FromImage($bsheet)
$g4.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::None
$g4.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half

# frame0: fence (shaded posts + horizontal planks + nail dots)
FillRectShaded $g4 2 20 4 10 90 64 42
FillRectShaded $g4 26 20 4 10 90 64 42
FillRectShaded $g4 0 12 32 5 150 108 72
FillRectShaded $g4 0 20 32 5 150 108 72
FillOval $g4 3 13 1.5 1.5 90 64 42
FillOval $g4 27 13 1.5 1.5 90 64 42
FillOval $g4 3 21 1.5 1.5 90 64 42
FillOval $g4 27 21 1.5 1.5 90 64 42

# frame1: well (shaded stone ring built from blocks + dark water center)
FillOvalShaded $g4 34 8 24 20 138 138 138
FillOvalShaded $g4 39 12 14 12 46 78 116
FillOval $g4 42 15 5 3 90 150 200
FillOvalShaded $g4 36 6 20 6 176 176 176
Fill $g4 38 5 3 3 152 152 152
Fill $g4 44 5 3 3 152 152 152
Fill $g4 50 5 3 3 152 152 152

# frame2: flower_bed (shaded soil with colorful flowers)
FillOvalShaded $g4 66 16 24 14 74 50 32
FillOval $g4 70 18 4 4 226 96 96
FillOval $g4 80 20 4 4 236 216 86
FillOval $g4 75 24 4 4 236 136 196
FillOval $g4 85 16 4 4 226 96 96
FillOval $g4 90 22 3 3 236 216 86
FillOval $g4 71 26 1 4 88 168 88
FillOval $g4 88 27 1 3 88 168 88

# frame3: signpost (shaded post + plank sign with painted text marks)
FillRectShaded $g4 110 14 4 18 110 76 48
FillRectShaded $g4 100 6 24 10 206 172 126
Fill $g4 104 10 3 2 110 76 48
Fill $g4 114 10 3 2 110 76 48
Fill $g4 103 8 14 1.5 140 104 70

# frame4: storage shed (shaded roof + wall + door + window)
FillRectShaded $g4 130 16 24 12 178 138 96
FillRectShaded $g4 128 6 28 12 158 62 52
FillRectShaded $g4 138 20 8 8 84 58 38
Fill $g4 145 23 1.5 2 224 196 64
FillRectShaded $g4 132 18 5 5 128 190 224

# frame5: rock (placed boulder, same look as the pickable rock-object)
FillOvalShaded $g4 163 13 26 16 100 100 100
FillOvalShaded $g4 162 9 24 16 140 140 140
FillOval $g4 166 12 12 7 172 172 172

$g4.Dispose()
$bsheet.Save((Join-Path $assetsDir "buildings.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$bsheet.Dispose()

# ---------- monster (32x32 x 1: small slime) ----------
$msheet = New-Object System.Drawing.Bitmap $tileSize, $tileSize
$g5 = [System.Drawing.Graphics]::FromImage($msheet)
$g5.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::None
$g5.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half

DrawGroundShadow $g5 16 28 18 4
FillOvalShaded $g5 6 8 20 18 152 58 164
FillOval $g5 10 10 10 6 194 104 204
FillOval $g5 13 4 2 5 130 46 142
FillOval $g5 18 3 2 6 130 46 142
FillOval $g5 11 16 4 4 250 250 250
FillOval $g5 19 16 4 4 250 250 250
FillOval $g5 12 17 2 2 20 20 20
FillOval $g5 20 17 2 2 20 20 20
FillOvalAlpha $g5 14 21 4 2 255 255 255 130

$g5.Dispose()
$msheet.Save((Join-Path $assetsDir "monster.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$msheet.Dispose()

# ---------- npc (32x64 x 2: villager A, villager B) ----------
$nfw = 32; $nfh = 64
$nsheet = New-Object System.Drawing.Bitmap ($nfw * 2), $nfh
$g6 = [System.Drawing.Graphics]::FromImage($nsheet)
$g6.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::None
$g6.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half

function DrawNpc($gfx, $ox, $skinColor, $hairColor, $shirtColor) {
    # Same chunky DQ-ish proportions as the player, shaded to match, with a grounding shadow.
    DrawGroundShadow $gfx ($ox+16) 51 18 5
    Fill $gfx ($ox+8) 30 7 8 60 60 60
    FillRectShaded $gfx ($ox+8) 37 7 11 70 58 46
    FillRectShaded $gfx ($ox+17) 37 7 11 70 58 46
    FillRectShaded $gfx ($ox+8) 21 16 16 $shirtColor[0] $shirtColor[1] $shirtColor[2]
    Fill $gfx ($ox+8) 34 16 2 60 42 30
    FillRectShaded $gfx ($ox+4) 23 5 12 $shirtColor[0] $shirtColor[1] $shirtColor[2]
    FillRectShaded $gfx ($ox+23) 23 5 12 $shirtColor[0] $shirtColor[1] $shirtColor[2]
    FillOvalShaded $gfx ($ox+3) 33 6 6 $skinColor[0] $skinColor[1] $skinColor[2]
    FillOvalShaded $gfx ($ox+23) 33 6 6 $skinColor[0] $skinColor[1] $skinColor[2]
    FillOvalShaded $gfx ($ox+6) 3 20 17 $skinColor[0] $skinColor[1] $skinColor[2]
    FillOvalShaded $gfx ($ox+5) 0 22 9 $hairColor[0] $hairColor[1] $hairColor[2]
    FillOval $gfx ($ox+7) 13 3 2 240 150 150
    FillOval $gfx ($ox+22) 13 3 2 240 150 150
    FillOval $gfx ($ox+11) 10 3 3 40 30 30
    FillOval $gfx ($ox+18) 10 3 3 40 30 30
}

$npcSkin = @(245, 194, 138)
DrawNpc $g6 0 $npcSkin @(110, 74, 46) @(78, 150, 78)
DrawNpc $g6 $nfw $npcSkin @(70, 48, 32) @(214, 146, 64)

$g6.Dispose()
$nsheet.Save((Join-Path $assetsDir "npc.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$nsheet.Dispose()

# ---------- farm plot (32x32 x 3: empty soil, growing sprout, ready crop) ----------
$fsheet = New-Object System.Drawing.Bitmap ($tileSize * 3), $tileSize
$g7 = [System.Drawing.Graphics]::FromImage($fsheet)
$g7.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::None
$g7.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half

# frame0: empty tilled soil (furrows)
Fill $g7 0 0 32 32 102 182 76
Fill $g7 2 4 28 24 95 66 46
FillOval $g7 4 8 24 3 82 56 39
FillOval $g7 4 15 24 3 82 56 39
FillOval $g7 4 22 24 3 82 56 39

# frame1: growing (soil + small green sprouts, shaded)
Fill $g7 32 0 32 32 102 182 76
Fill $g7 34 4 28 24 95 66 46
FillOvalShaded $g7 37 10 6 12 60 138 70
FillOvalShaded $g7 47 8 6 14 60 138 70
FillOvalShaded $g7 55 10 6 12 60 138 70

# frame2: ready (soil + ripe orange crops, shaded)
Fill $g7 64 0 32 32 102 182 76
Fill $g7 66 4 28 24 95 66 46
FillOvalShaded $g7 68 11 10 12 222 126 30
FillOvalShaded $g7 79 9 10 14 222 126 30
FillOvalShaded $g7 89 11 8 12 222 126 30
FillOval $g7 71 13 3 3 90 160 70
FillOval $g7 82 11 3 3 90 160 70

$g7.Dispose()
$fsheet.Save((Join-Path $assetsDir "farm.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$fsheet.Dispose()

# ---------- animal (32x32 x 1: small rabbit) ----------
$asheet = New-Object System.Drawing.Bitmap $tileSize, $tileSize
$g8 = [System.Drawing.Graphics]::FromImage($asheet)
$g8.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::None
$g8.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half

DrawGroundShadow $g8 15 27 18 4
FillOvalShaded $g8 6 14 20 14 238 238 238
FillOvalShaded $g8 9 6 14 12 238 238 238
FillOvalShaded $g8 10 0 5 10 238 238 238
FillOvalShaded $g8 17 0 5 10 238 238 238
FillOval $g8 11 2 2 6 240 190 200
FillOval $g8 18 2 2 6 240 190 200
FillOval $g8 19 10 2 2 40 30 30
FillOvalShaded $g8 4 20 5 5 238 238 238

$g8.Dispose()
$asheet.Save((Join-Path $assetsDir "animal.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$asheet.Dispose()

# ---------- shop (32x32 x 1: small market stall) ----------
$shsheet = New-Object System.Drawing.Bitmap $tileSize, $tileSize
$g9 = [System.Drawing.Graphics]::FromImage($shsheet)
$g9.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::None
$g9.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half

DrawGroundShadow $g9 16 30 26 3
FillRectShaded $g9 4 20 24 8 178 138 96
Fill $g9 4 20 24 3 200 160 114
FillRectShaded $g9 4 10 3 12 110 76 48
FillRectShaded $g9 25 10 3 12 110 76 48
FillRectShaded $g9 2 4 28 8 222 78 78
Fill $g9 2 4 7 8 240 240 240
Fill $g9 16 4 7 8 240 240 240
FillOval $g9 2 10 28 4 168 54 54

$g9.Dispose()
$shsheet.Save((Join-Path $assetsDir "shop.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$shsheet.Dispose()

# ---------- rock object (32x32 x 1: a pickable/placeable boulder) ----------
$rsheet = New-Object System.Drawing.Bitmap $tileSize, $tileSize
$g10 = [System.Drawing.Graphics]::FromImage($rsheet)
$g10.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::None
$g10.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half

DrawGroundShadow $g10 16 27 22 4
FillOvalShaded $g10 3 13 26 16 100 100 100
FillOvalShaded $g10 2 9 24 16 140 140 140
FillOval $g10 6 12 12 7 172 172 172
FillOval $g10 18 16 6 4 112 112 112

$g10.Dispose()
$rsheet.Save((Join-Path $assetsDir "rock-object.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$rsheet.Dispose()

Write-Output "written: $assetsDir\tileset.png, $assetsDir\player.png, $assetsDir\gathering.png, $assetsDir\buildings.png, $assetsDir\monster.png, $assetsDir\npc.png, $assetsDir\farm.png, $assetsDir\animal.png, $assetsDir\shop.png, $assetsDir\rock-object.png"
