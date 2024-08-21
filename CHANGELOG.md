# Changelog
All notable changes to Relay will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

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
- Localize/Internationalize Relay! Start with englsh and german locales, pending the actual German translations.

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