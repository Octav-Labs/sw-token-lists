const fs = require("fs");

function isTrustedReleaseCommit(commit, trustedAuthor, trustedCommitter) {
  return (
    commit?.author?.login === trustedAuthor &&
    commit?.committer?.login === trustedCommitter &&
    commit?.commit?.verification?.verified === true
  );
}

if (require.main === module) {
  const commit = JSON.parse(fs.readFileSync(0, "utf8"));
  const trustedAuthor = process.env.TRUSTED_AUTOMATION_LOGIN;
  const trustedCommitter = process.env.TRUSTED_COMMITTER_LOGIN;

  if (!isTrustedReleaseCommit(commit, trustedAuthor, trustedCommitter)) {
    console.error(
      `Release commit is not trusted: author=${commit?.author?.login || ""}, committer=${commit?.committer?.login || ""}, verified=${commit?.commit?.verification?.verified === true}`
    );
    process.exit(1);
  }
}

module.exports = { isTrustedReleaseCommit };
