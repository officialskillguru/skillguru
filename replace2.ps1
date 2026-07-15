$files = Get-ChildItem -Path "c:\Projects\Skill_Guru\src" -Recurse -Filter "*.tsx"
$count = 0
foreach ($file in $files) {
    $content = [IO.File]::ReadAllText($file.FullName)
    $newContent = $content -replace 'text-\[#475569\]', 'text-slate-600' `
                           -replace 'text-\[#0F2B7A\]', 'text-primary' `
                           -replace 'bg-\[#0F2B7A\]', 'bg-primary' `
                           -replace 'border-\[#0F2B7A\]', 'border-primary' `
                           -replace 'hover:text-\[#0F2B7A\]', 'hover:text-primary' `
                           -replace 'bg-\[#F8FAFC\]', 'bg-muted' `
                           -replace 'bg-\[#EEF3FA\]', 'bg-slate-100' `
                           -replace 'bg-\[#22D3EE\]', 'bg-cyan-400'
    if ($content -cne $newContent) {
        [IO.File]::WriteAllText($file.FullName, $newContent)
        $count++
    }
}
Write-Output "Updated files: $count"
