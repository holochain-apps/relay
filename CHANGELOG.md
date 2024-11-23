# Changelog
All notable changes to Volla Messages will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

## [0.7.3] - 2024-11-23
- Fix: Blank screen on Ubuntu 22.04 was not actually fixed in 0.7.1. Now it is fixed.

## [0.7.2] - 2024-11-22
- Fix: macOS x64 builds no longer crash on launch
- Fix: Windows releases are now code signed

## [0.7.1] - 2024-11-12

### Added
- Automated release builds in CI
- Windows bundle code signing, macOS bundle code signing and notarization in CI
- Added a github env var IGNORE_WINDOWS_CODESIGNING_ERROR. When set to "true", errors with windows code signing will not be fatal to the build job.
- All releases except the Android app use a different icon with the Volla logo.
- Fix: Blank screen on Ubuntu 22.04

## [0.7.0-beta] - 2024-10-23

### Fixed
- Increase initial zome call timeout to avoid hanging on loading page
- Improve image loading resiliance by increasing retry rate exponential backoff to 2x
- Ensure image loading placeholder's error icon has contrasting color
- Fix: Prevent long group names from overflowing layout

### Added
- display error notice if conductor setup fails
- Update translations to use Volla Messages

## [0.7.0-beta-rc.0] - 2024-10-04

- Update name and icons, and splash screen

## [0.6.1-beta] - 2024-09-06

### Changed
- Don't include images in group invitation codes because it makes them too long
- Remove the hover toolips and click to copy on idneticons for users that don't have profile images
- Show in inbox conversation summary how many images were attached to the latest message

## [0.6.0-beta] - 2024-09-04

### Added
- New confirmation flow when creating a contact. Immediately add a 1:1 conversation with the new contact and go straight there, with a notice that they need to "confirm" the connection, and a button to send them the invite link.
- Ability to click on links in messages to open them in external browser
- Add basic search to conversation list, only matches conversation titles right now
- Translations for German, Spanish, French, Italian, Bulgarian, Norwegian, Romanian, Danish, Swedish, Slovak
- Many more small UI improvements and fixes

### Fixed
- Copying and pasting invite codes in Tauri android
- Make sure mobile keyboard never covers content
- Allow for scrolling long member list for conversation
- Correctly sanitize html in message content, allowing for safe tags

## [0.5.3-beta] - 2024-08-23

### Added
- First version of on device notifications

### Changed
- Improved flow and UI of creating and editing contacts

### Fixed
- Syncing of images with messages
- Make sure invited contacts appear after creating a private conversation

## [0.5.2-beta] - 2024-08-20

### Added
- Light mode and dark mode themes, which respect the OS theme setting

### Changed
- Lots of little UI tweaks and improvements

### Fixed
- Wrapping of long words in messages
- Removed scrollbar on splashscreen

## [0.5.1-beta] - 2024-08-17

### Added
- Localize/Internationalize  Start with english and german locales, pending the actual German translations.

### Changed
- Display name and avatar from a local contact first, then from the agent's profile if there is no contact for them
- When there are multiple messages in a 5 minute period from the same person don't display their name and avatar for every message

### Fixed
- Correctly escape content when displaying it in the UI
- Show correct most recent message in Inbox
- Show correct unread status in Inbox
- Sorting conversations in the inbox according to most recent activity

## [0.5.0-beta] - 2024-08-07
First public Beta release of Relay! Includes profile creation and editing, private conversations with selected contacts, group conversations with invited links, contact book, image attachments and more.