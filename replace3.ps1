$files = Get-ChildItem -Path "c:\Projects\Skill_Guru\src" -Recurse -Filter "*.tsx"
$count = 0
foreach ($file in $files) {
    $content = [IO.File]::ReadAllText($file.FullName)
    $newContent = $content -replace 'bg-\[#E5EAF5\]', 'bg-border' `
                           -replace 'text-\[#22D3EE\]', 'text-cyan-400' `
                           -replace 'bg-\[#22D3EE\]', 'bg-cyan-400' `
                           -replace 'bg-\[#F1F5FF\]', 'bg-indigo-50' `
                           -replace 'hover:bg-\[#F1F5FF\]', 'hover:bg-indigo-50' `
                           -replace 'text-\[#2F1F8A\]', 'text-indigo-900' `
                           -replace 'via-\[#2F1F8A\]', 'via-indigo-900' `
                           -replace 'to-\[#2F1F8A\]', 'to-indigo-900' `
                           -replace 'hover:bg-\[#1a2b9e\]', 'hover:bg-blue-800' `
                           -replace 'border-\[#19C7C8\]', 'border-accent' `
                           -replace 'bg-\[#031B34\]', 'bg-slate-900' `
                           -replace 'text-\[#0F172A\]', 'text-foreground' `
                           -replace 'text-\[#007BFF\]', 'text-primary' `
                           -replace 'bg-\[#EEF4FF\]', 'bg-slate-100' `
                           -replace 'text-\[#334155\]', 'text-slate-700' `
                           -replace 'text-\[#22C55E\]', 'text-emerald-500' `
                           -replace 'shadow-\[#5B35F2\]', 'shadow-secondary' `
                           -replace 'shadow-\[#111E79\]', 'shadow-primary' `
                           -replace 'to-\[#19C7C8\]', 'to-accent'
    if ($content -cne $newContent) {
        [IO.File]::WriteAllText($file.FullName, $newContent)
        $count++
    }
}
Write-Output "Updated files: $count"
