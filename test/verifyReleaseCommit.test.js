const { expect } = require("chai");
const {
  isTrustedReleaseCommit,
} = require("../scripts/verifyReleaseCommit");

const trustedAuthor = "github-actions[bot]";
const trustedCommitter = "web-flow";

function commitWith({ author = trustedAuthor, committer = trustedCommitter }) {
  return {
    author: { login: author },
    committer: { login: committer },
    commit: { verification: { verified: true } },
  };
}

describe("release commit verification", () => {
  it("accepts a GitHub-signed automation commit", () => {
    expect(
      isTrustedReleaseCommit(
        commitWith({}),
        trustedAuthor,
        trustedCommitter
      )
    ).to.equal(true);
  });

  it("rejects a verified automation-authored commit with another signer", () => {
    expect(
      isTrustedReleaseCommit(
        commitWith({ committer: "untrusted-signer" }),
        trustedAuthor,
        trustedCommitter
      )
    ).to.equal(false);
  });
});
