/* eslint-disable no-template-curly-in-string */
/*
 * conventional-changelog-conventionalcommits is deliberately held at 9.x.
 * Version 10 requires conventional-changelog-writer 9+, while the current
 * stable @semantic-release/release-notes-generator (14.1.1) and
 * @semantic-release/commit-analyzer (13.0.1) both depend on writer ^8. With
 * the 10.x preset the release fails in generateNotes with
 * 'Missing helper: ... requires conventional-changelog-writer@9 or newer'.
 */
module.exports = {
  plugins: [
    [
      '@semantic-release/commit-analyzer',
      {
        preset: 'conventionalcommits',
      },
    ],
    [
      '@semantic-release/release-notes-generator',
      {
        preset: 'conventionalcommits',
        presetConfig: {
          types: [
            { type: 'feat', section: 'Features' },
            { type: 'fix', section: 'Bug Fixes' },
            { type: 'doc', hidden: false, section: 'Documentation' },
            { type: 'docs', hidden: false, section: 'Documentation' },
            { type: 'chore', hidden: true, section: 'Chores' },
          ],
        },
      },
    ],
    '@semantic-release/changelog',
    [
      '@semantic-release/npm',
      {
        npmPublish: false,
      },
    ],
    [
      '@semantic-release/exec',
      {
        prepareCmd: './scripts/update_readme.sh "${nextRelease.version}" "$GITHUB_REF"',
      },
    ],
    [
      '@semantic-release/git',
      {
        assets: ['CHANGELOG.md', 'README.md', 'package.json', 'package-lock.json', 'npm-shrinkwrap.json'],
      },
    ],
    [
      '@semantic-release/github',
      {
        assets: 'dist/*.js',
      },
    ],
  ],
  preset: 'conventionalcommits',
  branches: [{ name: 'main' }, { name: 'dev', prerelease: true }],
};
