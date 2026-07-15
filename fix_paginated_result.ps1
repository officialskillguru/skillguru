$sharedPath = "src\services\_shared.ts"
(Get-Content $sharedPath) -replace 'pageSize: number;', "pageSize: number;`n  totalPages: number;" | Set-Content $sharedPath

$services = Get-ChildItem -Path "src\services" -Filter "*.ts" -File
foreach ($file in $services) {
    if ($file.Name -ne "_shared.ts") {
        $content = Get-Content $file.FullName
        $content = $content -replace 'return \{ data: data \?\? \[\], count: count \?\? 0, page, pageSize \};', 'return { data: data ?? [], count: count ?? 0, page, pageSize, totalPages: Math.ceil((count ?? 0) / pageSize) };'
        $content | Set-Content $file.FullName
    }
}
