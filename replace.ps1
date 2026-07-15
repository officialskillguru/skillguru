$files = Get-ChildItem -Path "c:\Projects\Skill_Guru\src" -Recurse -Filter "*.tsx"
$count = 0
foreach ($file in $files) {
    $content = [IO.File]::ReadAllText($file.FullName)
    $newContent = $content -replace 'text-\[#111E79\]', 'text-primary' `
                           -replace 'bg-\[#111E79\]', 'bg-primary' `
                           -replace 'border-\[#111E79\]', 'border-primary' `
                           -replace 'from-\[#111E79\]', 'from-primary' `
                           -replace 'text-\[#5B35F2\]', 'text-secondary' `
                           -replace 'bg-\[#5B35F2\]', 'bg-secondary' `
                           -replace 'border-\[#5B35F2\]', 'border-secondary' `
                           -replace 'text-\[#19C7C8\]', 'text-accent' `
                           -replace 'bg-\[#19C7C8\]', 'bg-accent' `
                           -replace 'text-\[#64748B\]', 'text-muted-foreground' `
                           -replace 'text-\[#94A3B8\]', 'text-slate-400' `
                           -replace 'border-\[#E5EAF5\]', 'border-border' `
                           -replace 'border-\[#DDE7F6\]', 'border-border' `
                           -replace 'bg-\[#F8FAFF\]', 'bg-muted' `
                           -replace 'bg-\[#020617\]', 'bg-card' `
                           -replace 'bg-\[#020817\]', 'bg-card'
    if ($content -cne $newContent) {
        [IO.File]::WriteAllText($file.FullName, $newContent)
        $count++
    }
}
Write-Output "Updated files: $count"
