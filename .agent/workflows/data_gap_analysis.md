---
description: detailed report on missing database tables and columns
---

# Data Gap Analysis Report

_Last Updated: 2026-02-09_

## 1. Executive Summary

Crucial application data layers are missing from the backend schema. While core insurance logic is supported, user-facing features (Profiles, Chat, Knowledge Base) lack storage, currently relying on hardcoded or ephemeral data.

## 2. Identified Gaps

| Feature            | UI Requirement                          | Database Status | Action Required                     |
| :----------------- | :-------------------------------------- | :-------------- | :---------------------------------- |
| **User Profile**   | Avatar, Pro Plan Badge, Theme Prefs     | ✅ Resolved     | Table `profiles` updated            |
| **Chat History**   | Conversation List, Messages, Timestamps | ✅ Resolved     | Tables `chats` & `messages` updated |
| **Knowledge Base** | File Metadata, Status, Upload Time      | ✅ Resolved     | Table `knowledge_files` updated     |
| **Workspaces**     | Project grouping                        | ✅ Resolved     | Table `workspaces` created          |
| **Feature Card**   | Status Flags (e.g., "New Update")       | ❌ Missing      | Add to `system_flags` or `profiles` |

## 3. Detailed Findings

### 3.1 User Profiles

- **Frontend**: Displays "Ac ost", "Pro Plan", Theme (Purple/Blue/Orange), Language.
- **Database**: Only `policies.holder_name` exists. No table links Auth ID to application settings.
- **Risk**: User settings will reset on refresh/logout.

### 3.2 Chat System

- **Frontend**: Shows history groups ("Today", "Yesterday"), distinct conversations.
- **Database**: No tables found for storing questions, answers, or session metadata.
- **Risk**: Chat history is strictly local/ephemeral.

### 3.3 Knowledge Garden

- **Frontend**: "Product_Requirements_v2.pdf", size, upload time.
- **Database**: `vdts_manuals` exists but appears to be for static system manuals, not user uploads.
- **Risk**: Uploaded files are likely not persisting metadata correctly or relying solely on storage buckets without relational links.

## 4. Schema Recommendations

```sql
-- 1. Profiles Table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  plan_tier TEXT DEFAULT 'free',
  preferences JSONB DEFAULT '{"theme": "system", "language": "en", "send_key": "Enter", "performance_mode": false}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Workspaces (Projects)
CREATE TABLE workspaces (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  name TEXT NOT NULL,
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Chat System
CREATE TABLE chats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  workspace_id UUID REFERENCES workspaces(id),
  title TEXT,
  is_pinned BOOLEAN DEFAULT FALSE,
  category TEXT,
  last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('user', 'assistant')),
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Knowledge Files
CREATE TABLE knowledge_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  filename TEXT NOT NULL,
  resource_type TEXT CHECK (resource_type IN ('file', 'website')) DEFAULT 'file',
  file_size TEXT, -- Store as text for UI display or BIGINT if bytes
  storage_path TEXT,
  website_url TEXT,
  status TEXT DEFAULT 'uploaded',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```
