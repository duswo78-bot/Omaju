$url = 'https://api.github.com/repos/duswo78-bot/Omaju/actions/runs/32919426361'
for ($i = 0; $i -lt 40; $i++) {
  Start-Sleep -Seconds 30
  try {
    $r = Invoke-RestMethod -Uri $url -Headers @{ 'User-Agent' = 'omaju-watch' }
    if ($r.status -eq 'completed') {
      if ($r.conclusion -eq 'success') {
        Write-Output 'DONE'
        exit 0
      }
      Write-Output ("FAILED:" + $r.conclusion)
      exit 1
    }
  } catch {
    # keep waiting
  }
}
Write-Output 'FAILED:timeout'
exit 1
