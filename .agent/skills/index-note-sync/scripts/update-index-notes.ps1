param(
    [string]$RepoRoot = "c:/Users/ippou/Documents/portfolio/porject/note",
    [int]$Count = 3,
    [string]$TagMapPath = "",
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

function Escape-Html {
    param([string]$Text)
    if ($null -eq $Text) { return '' }
    return [System.Net.WebUtility]::HtmlEncode($Text)
}

function Get-BaseKey {
    param([string]$FileName)
    $name = [System.IO.Path]::GetFileNameWithoutExtension($FileName)
    return ($name -replace '_v\d+$', '')
}

function Get-VersionNo {
    param([string]$FileName)
    $name = [System.IO.Path]::GetFileNameWithoutExtension($FileName)
    $m = [regex]::Match($name, '_v(\d+)$')
    if ($m.Success) { return [int]$m.Groups[1].Value }
    return 1
}

function Get-SummaryFromLines {
    param([string[]]$Lines)

    $start = 0
    for ($i = 0; $i -lt $Lines.Count; $i++) {
        if ($Lines[$i].Trim() -match '^本文') {
            $start = $i + 1
            break
        }
    }

    for ($i = $start; $i -lt $Lines.Count; $i++) {
        $t = $Lines[$i].Trim()
        if ($t -eq '') { continue }
        if ($t -match '^#') { continue }
        if ($t -match '^[-*]\s+') { continue }
        if ($t -match '^\d+\.\s+') { continue }
        if ($t -match '^---+$') { continue }
        if ($t -match '進捗[:：]\s*\d+\s*/\s*100') { continue }
        if ($t -match '^Title案') { continue }
        if ($t -match '^次回の実験') { continue }
        return $t
    }

    return '記事要約は準備中です。'
}

function Parse-Article {
    param([System.IO.FileInfo]$File)

    $raw = Get-Content -Raw -Encoding UTF8 $File.FullName
    $lines = Get-Content -Encoding UTF8 $File.FullName

    $title = [System.IO.Path]::GetFileNameWithoutExtension($File.Name) -replace '_v\d+$', ''
    $summary = Get-SummaryFromLines -Lines $lines

    $progress = 0
    $pm = [regex]::Match($raw, '進捗[:：]\s*(\d+)\s*/\s*100')
    if ($pm.Success) {
        $progress = [int]$pm.Groups[1].Value
    }

    [pscustomobject]@{
        FileName = $File.Name
        Title = $title
        Summary = $summary
        Progress = $progress
        LastWriteTime = $File.LastWriteTime
    }
}

$draftDir = Join-Path $RepoRoot '30_outputs/drafts'
$indexPath = Join-Path $RepoRoot '60_portfoliosite/index.html'

if (-not (Test-Path $draftDir)) { throw "drafts directory not found: $draftDir" }
if (-not (Test-Path $indexPath)) { throw "index.html not found: $indexPath" }

$all = Get-ChildItem -File $draftDir -Filter '*.md' |
    Where-Object { $_.Name -notmatch '\.bak(\.md)?$' -and $_.Name -notmatch 'bak\.md$' }

$selected = $all |
    Group-Object { Get-BaseKey $_.Name } |
    ForEach-Object {
        $_.Group |
            Sort-Object @{Expression={ Get-VersionNo $_.Name }; Descending=$true}, @{Expression='LastWriteTime';Descending=$true} |
            Select-Object -First 1
    } |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First $Count

if (-not $selected -or $selected.Count -eq 0) {
    throw 'No markdown files were selected.'
}

$tagMap = @{}
if ($TagMapPath -and (Test-Path $TagMapPath)) {
    $obj = Get-Content -Raw -Encoding UTF8 $TagMapPath | ConvertFrom-Json
    if ($obj) {
        foreach ($p in $obj.PSObject.Properties) {
            $tagMap[$p.Name] = @($p.Value)
        }
    }
}

$cards = foreach ($file in $selected) {
    $a = Parse-Article -File $file

    $tags = @('実践記録', 'AI活用', '業務改善')
    if ($tagMap.ContainsKey($a.FileName)) {
        $custom = @($tagMap[$a.FileName])
        if ($custom.Count -gt 0) { $tags = $custom }
    }

    $tagsHtml = ($tags | Select-Object -First 3 | ForEach-Object { '                    <span class="tag">' + (Escape-Html $_) + '</span>' }) -join "`r`n"

@"
            <div class="card">
                <span class="progress-badge">$($a.Progress) / 100</span>
                <h3>$(Escape-Html $a.Title)</h3>
                <p>$(Escape-Html $a.Summary)</p>
                <div class="tags">
$tagsHtml
                </div>
                <a class="card-link" href="#" target="_blank" rel="noopener noreferrer">noteで読む →</a>
            </div>
"@
}

$cardsHtml = ($cards -join "`r`n")
$latestHtml = @"
    <!-- Latest Note -->
    <section class="section" id="note">
        <h2 class="section-header">Latest Note</h2>
        <div class="cards">
$cardsHtml
        </div>
        <div class="note-more">
            <a class="btn" href="#" aria-label="その他の記事一覧（準備中）">その他の記事を見る（準備中）</a>
            <p>過去記事へのリンクは順次追加します。</p>
        </div>
    </section>
"@

$index = Get-Content -Raw -Encoding UTF8 $indexPath
$updated = [regex]::Replace($index, '(?s)<!-- Latest Note -->.*?</section>', $latestHtml)

if ($updated -eq $index) {
    throw 'Latest Note section replacement failed. Marker not found or unchanged.'
}

if ($DryRun) {
    Write-Output $latestHtml
    exit 0
}

$ts = Get-Date -Format 'yyyyMMddHHmmss'
Copy-Item $indexPath "$indexPath.bak-$ts" -Force
Set-Content -LiteralPath $indexPath -Value $updated -Encoding UTF8

Write-Output "Updated: $indexPath"
Write-Output "Backup:  $indexPath.bak-$ts"
Write-Output "Files:   $($selected.Name -join ', ')"
