# Contributing

Help is always welcome and there are plenty of options how you can contribute to Sovryn Origins.

In particular, we appreciate support in the following areas:

- Reporting issues.
- Fixing and responding to [Sovryn Origins's GitHub issues](https://github.com/Sovryn-Origins/origins/issues)
- Improving the documentation.
- Translating the documentation into more languages.

To get started, you can try to setup the repo locally. Run the tests. Check the scripts in `development` or other local blockchain, then even on testnets. Also, it may be useful to become well-versed at writing smart-contracts in Solidity.

Please note that this project is released with a [Contributor Code of Conduct](https://raw.githubusercontent.com/Sovryn-Origins/origins/CODE_OF_CONDUCT.md). By participating in this project - in the issues, pull requests, or chat channels - you agree to abide by its terms.

# How to Report Issues

To report an issue, please use the [GitHub issues tracker](https://github.com/Sovryn-Origins/origins/issues). When reporting issues, please mention the following details:

- Function Call.
- Steps to reproduce the issue.
- Actual vs. expected behaviour.

Reducing the source code that caused the issue to a bare minimum is always very helpful and sometimes even clarifies a misunderstanding.

# Workflow for Pull Requests

In order to contribute, please fork off of the `development` branch and make your changes there. Your commit messages should detail _why_ you made your change in addition to _what_ you did (unless it is a tiny change).

Additionally, if you are writing a new feature, please ensure you add appropriate test cases in [tests](tests) as mentioned below.

However, if you are making a larger change, please consult with the [Contributors of Sovryn Origins](https://discord.gg/gjkPdRT9kA).

Also, even though we do CI testing, please test your code and
ensure that it builds locally before submitting a pull request.

Thank you for your help!

# Running the Tests

## Prerequisites

First install all the npm packages:

```
npm ci
```

## Running the Tests

To run tests written in JS:

```
npm run test
```

## Writing Tests

Tests are mainly written in JS and run using `hardhat`.

Find the appropriate folder in test to write the tests for a particular test.

For a new smart contract, tests should cover different personas, like creator, owner/admin, user, state changes, event emitted, etc.

If there is a common custom function, write it in [utils.js](tests/utils.js), and import into the required tests.

If there are constants or variables, declare them in [constants.js](tests/constants.js) & [variable.js](tests/variable.js) respectively.

Code Coverage is good, complete functionality test (unit & integration) is better.

## English Language

Use English, with British English spelling preferred, unless using project or brand names. Try to reduce the usage of
local slang and references, making your language as clear to all readers as possible. Below are some references to help:

- [Simplified technical English](https://en.wikipedia.org/wiki/Simplified_Technical_English)
- [International English](https://en.wikipedia.org/wiki/International_English)
- [British English spelling](https://en.oxforddictionaries.com/spelling/british-and-spelling)
