@echo off
echo Restoring exact content from commit 8aa926adad7a5072ccd01611a6a8d180e7ea072a

REM Set git pager to cat to avoid pager issues
git config --local core.pager ""

REM Extract all files from the commit
git archive 8aa926adad7a5072ccd01611a6a8d180e7ea072a | tar -xf -

REM Add all changes
git add .

REM Get the exact commit message
for /f "delims=" %%i in ('git log --format=%%B -n 1 8aa926adad7a5072ccd01611a6a8d180e7ea072a') do set COMMIT_MSG=%%i

REM Commit with exact message
git commit -m "%COMMIT_MSG%"

echo Done! Created new commit with exact content from 8aa926adad7a5072ccd01611a6a8d180e7ea072a





