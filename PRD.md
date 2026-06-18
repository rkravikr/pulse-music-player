# Pulse - Product Requirements Document (PRD)

## 1. Product Overview

### Product Name

**Pulse**

### Tagline

**Your Music. Your Library.**

### Product Type

Offline Desktop Music Player

### Platform

- Windows (MVP)
- Built using Electron

### Vision

Pulse is a modern offline desktop music player that provides a premium listening experience while maintaining complete control over local music libraries. Users can organize, search, play, and manage their music collection through a clean and modern interface inspired by contemporary streaming applications without relying on internet connectivity.

---

# 2. Goals

## Primary Goals

- Create a modern desktop music player.
- Support local music libraries.
- Provide a fast and responsive experience.
- Offer playlist and library management.
- Maintain complete offline functionality.
- Deliver a polished user experience.

## Non-Goals (MVP)

The following features are intentionally excluded from MVP:

- Lyrics
- Audio Visualizer
- Equalizer
- Theme System
- Artist Pages
- Cloud Sync
- Online Streaming
- Music Recommendations
- Social Features
- Metadata Editing

---

# 3. Target Users

## Primary Users

- Users with local music collections
- Students
- Developers
- Music enthusiasts
- Users who prefer offline listening

## User Needs

- Organize music libraries
- Quickly search songs
- Manage playlists
- Resume listening sessions
- Access music without internet

---

# 4. Technology Stack

## Frontend

- React
- TypeScript
- Tailwind CSS
- Zustand
- Motion
- Lucide React

## Desktop Framework

- Electron

## Database

- SQLite

## Music Metadata

- music-metadata

## Drag and Drop

- dnd-kit

---

# 5. Core Features

## 5.1 Music Library

### Description

Users can add one or more folders containing music files.

### Supported Formats

- MP3
- FLAC
- WAV
- AAC
- M4A
- OGG

### Functionality

- Add music folders
- Remove music folders
- Rescan library
- Auto-detect music files
- Extract metadata
- Extract album artwork

### Metadata Stored

- Song ID
- Title
- Artist
- Album
- Genre
- Duration
- Track Number
- File Path
- Album Artwork
- Date Added
- Play Count
- Last Played

---

## 5.2 Audio Playback

### Controls

- Play
- Pause
- Next
- Previous

### Playback Features

- Seek Bar
- Volume Control
- Shuffle
- Repeat One
- Repeat All

### Persistent Playback

Store:

- Current Song
- Current Position
- Current Queue
- Playback State
- Volume Level

Restore automatically on launch.

---

## 5.3 Queue System

### Queue Behavior

When a user plays a song from a list:

Example:

Song List

1. Song A
2. Song B
3. Song C
4. Song D

Selecting Song B results in:

Current Song:
Song B

Queue:

- Song C
- Song D

### Queue Features

- View Queue
- Remove Song from Queue
- Reorder Queue
- Queue Persistence

---

## 5.4 Playlists

### Playlist Creation

User can create playlists with:

- Name
- Description
- Cover Image

### Playlist Features

- Add Songs
- Remove Songs
- Delete Playlist
- Drag & Drop Reordering
- Playlist Song Count
- Total Duration

### Smart Playlist

#### Liked Songs

When a song is marked as favorite:

- Automatically added to Liked Songs

---

## 5.5 Search

### Global Search

Search across:

- Song Title
- Artist
- Album
- Genre
- Playlist Name

### Search Requirements

- Real-time search
- Case-insensitive
- Fast response

---

## 5.6 Albums

### Album View

Automatically generated from metadata.

Display:

- Album Cover
- Album Name
- Artist
- Number of Songs

### Album Page

Contains:

- Album Artwork
- Track List
- Total Duration

---

## 5.7 Recently Played

### Requirements

Store last 50 played songs.

### Behavior

- Most recent songs appear first.
- Oldest entries removed automatically.
- Persist between sessions.

---

## 5.8 Settings

### Music Sources

Users can:

- Add Folder
- Remove Folder

### Library Management

Users can:

- Rescan Library

### Session Settings

- Resume Previous Session

---

# 6. User Interface

## Design Principles

- Modern
- Minimal
- Dark Theme
- Smooth Animations
- Responsive Layout

## Theme

Dark Mode Only

### Colors

Background:

- Dark charcoal

Surface:

- Slightly lighter dark

Accent:

- Teal / Cyan

Text:

- White
- Light Gray

---

# 7. Navigation Structure

## Sidebar

Home

Library

- Songs
- Albums
- Liked Songs

Playlists

- User Playlists

Recently Played

Settings

---

# 8. Page Specifications

## Home

Display:

- Recently Played
- Quick Access Playlists
- Resume Playback

---

## Songs Page

Display:

- Song List
- Search Bar

Sorting:

- Title
- Artist
- Album
- Duration
- Date Added

---

## Albums Page

Display:

- Album Grid

Each album card shows:

- Cover Art
- Album Name
- Artist

---

## Playlist Page

Display:

- Playlist Cover
- Playlist Details
- Song List

Actions:

- Play Playlist
- Edit Playlist Cover
- Delete Playlist

---

## Recently Played Page

Display:

- Last 50 songs

---

## Settings Page

Display:

- Music Sources
- Library Management
- Session Preferences

---

# 9. Bottom Player

Always visible.

## Components

### Left Section

- Album Cover
- Song Title
- Artist

### Center Section

- Previous
- Play/Pause
- Next
- Shuffle
- Repeat

### Progress

- Current Time
- Progress Bar
- Total Duration

### Right Section

- Volume
- Queue Button

---

# 10. Database Schema

## songs

| Field        | Type     |
| ------------ | -------- |
| id           | TEXT     |
| title        | TEXT     |
| artist       | TEXT     |
| album        | TEXT     |
| genre        | TEXT     |
| duration     | INTEGER  |
| track_number | INTEGER  |
| file_path    | TEXT     |
| artwork_path | TEXT     |
| play_count   | INTEGER  |
| last_played  | DATETIME |
| date_added   | DATETIME |

---

## playlists

| Field       | Type     |
| ----------- | -------- |
| id          | TEXT     |
| name        | TEXT     |
| description | TEXT     |
| cover_image | TEXT     |
| created_at  | DATETIME |

---

## playlist_songs

| Field       | Type    |
| ----------- | ------- |
| playlist_id | TEXT    |
| song_id     | TEXT    |
| sort_order  | INTEGER |

---

## settings

| Field | Type |
| ----- | ---- |
| key   | TEXT |
| value | TEXT |

---

## recently_played

| Field     | Type     |
| --------- | -------- |
| id        | TEXT     |
| song_id   | TEXT     |
| played_at | DATETIME |

---

## queue

| Field    | Type    |
| -------- | ------- |
| position | INTEGER |
| song_id  | TEXT    |

---

# 11. Performance Requirements

### Library Load

Target:

- Under 2 seconds

### Search

Target:

- Under 100ms

### Playback

Target:

- Instant playback

### Memory Usage

Target:

- Efficient handling of large libraries

---

# 12. Security

- Local-only storage
- No internet dependency
- No user tracking
- No telemetry

---

# 13. Future Roadmap

## Version 2

- Lyrics Support
- Audio Visualizer
- Equalizer
- Crossfade
- Keyboard Shortcuts
- Mini Player

## Version 3

- Artist Pages
- Themes
- Smart Playlists
- Play Statistics
- Advanced Library Analytics

---

# 14. Success Criteria

Pulse MVP is considered successful when:

- User can add music folders.
- Library is scanned successfully.
- Songs play reliably.
- Playlists work correctly.
- Search works across library.
- Session persistence works.
- Queue persistence works.
- Recently played works.
- UI feels modern and responsive.
- Application can be packaged and installed on Windows.
