$resp = Invoke-RestMethod -Uri 'https://api.github.com/repos/duswo78-bot/Omaju/actions/runs?per_page=5' -Headers @{ 'User-Agent' = 'omaju' }
foreach ($x in $resp.workflow_runs) {
  $sha = $x.head_sha.Substring(0, 7)
  Write-Output ("{0}`t{1}`t{2}`t{3}`t{4}`t{5}" -f $x.id, $x.name, $x.status, $x.conclusion, $sha, $x.html_url)
}
