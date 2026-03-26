---
title: Mermaid Diagrams
description: Mermaid diagram types with Northwestern theme styling.
---

The theme applies Northwestern colors to [Mermaid](https://mermaid.js.org/) diagrams and adds a fullscreen viewer with pan/zoom, SVG download, source copying, and touch support. Hover any diagram below to see the toolbar.

See [Getting Started](/getting-started/#mermaid-diagrams-optional) for setup instructions.

## Flowchart

```mermaid
flowchart TD
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Great!]
    B -->|No| D[Debug]
    D --> B
    C --> E[Deploy]
```

## Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    actor S as Student
    participant LMS as Learning Management
    participant DB as Database
    participant Email as Email Service

    S->>LMS: Submit Assignment
    activate LMS
    LMS->>DB: Store Submission
    activate DB
    DB-->>LMS: Confirmation
    deactivate DB

    LMS->>Email: Notify Instructor
    activate Email
    Email-->>LMS: Sent
    deactivate Email

    LMS-->>S: Submission Confirmed
    deactivate LMS

    Note over S,Email: Grading Process

    rect rgb(78, 42, 132, 0.1)
        LMS->>DB: Fetch Submission
        DB-->>LMS: Assignment Data
        LMS-->>S: Grade Posted
    end
```

## Class Diagram

```mermaid
classDiagram
    class User {
        +String name
        +String email
        +login()
        +logout()
    }
    class Admin {
        +manageUsers()
        +viewLogs()
    }
    class Student {
        +enrollCourse()
        +viewGrades()
    }
    User <|-- Admin
    User <|-- Student
```

## State Diagram

```mermaid
stateDiagram-v2
    [*] --> Draft
    Draft --> Review : Submit
    Review --> Approved : Approve
    Review --> Draft : Request Changes
    Approved --> Published : Publish
    Published --> [*]
```

## Entity Relationship Diagram

```mermaid
erDiagram
    STUDENT ||--o{ ENROLLMENT : has
    COURSE ||--o{ ENROLLMENT : has
    DEPARTMENT ||--o{ COURSE : offers
    STUDENT {
        int id PK
        string name
        string email
    }
    COURSE {
        int id PK
        string title
        int credits
    }
    ENROLLMENT {
        int student_id FK
        int course_id FK
        date enrolled_at
    }
    DEPARTMENT {
        int id PK
        string name
    }
```

## Gantt Chart

```mermaid
gantt
    title Project Timeline
    dateFormat YYYY-MM-DD
    section Planning
        Requirements     :a1, 2026-01-01, 14d
        Design           :a2, after a1, 10d
    section Development
        Frontend         :b1, after a2, 21d
        Backend          :b2, after a2, 28d
    section Launch
        Testing          :c1, after b2, 14d
        Deployment       :c2, after c1, 3d
```

## Pie Chart

```mermaid
pie title Northwestern Schools
    "Weinberg" : 35
    "McCormick" : 25
    "Medill" : 15
    "Kellogg" : 15
    "Other" : 10
```

## Git Graph

```mermaid
gitGraph
    commit
    commit
    branch feature
    checkout feature
    commit
    commit
    checkout main
    merge feature
    commit
```

## Mindmap

```mermaid
mindmap
    root((Northwestern Theme))
        Colors
            Purple Scale
            Neutrals
            Semantic
        Typography
            Akkurat Pro
            Poppins
        Components
            Cards
            Steps
            Tabs
        Modes
            Light
            Dark
```

## Timeline

```mermaid
timeline
    title Northwestern University Milestones
    section Founded
        1851 : Northwestern University chartered
    section Growth
        1870 : School of Law established
        1891 : School of Music founded
        1908 : Kellogg School of Management
    section Modern Era
        1948 : First computer on campus
        1985 : Technological Institute expansion
        2000 : McCormick School renovation
    section Recent
        2015 : Ryan Field renovation announced
        2020 : Remote learning transition
        2024 : New engineering campus opens
```

## Quadrant Chart

```mermaid
quadrantChart
    title Feature Prioritization Matrix
    x-axis Low Effort --> High Effort
    y-axis Low Impact --> High Impact
    quadrant-1 Plan Next
    quadrant-2 Do First
    quadrant-3 Delegate
    quadrant-4 Eliminate
    Dark Mode Support: [0.2, 0.9]
    Mermaid Integration: [0.4, 0.8]
    Custom Fonts: [0.3, 0.7]
    Print Stylesheet: [0.6, 0.5]
    Animation Effects: [0.8, 0.3]
    Icon Support: [0.5, 0.6]
    RTL Support: [0.9, 0.4]
    Social Cards: [0.7, 0.7]
```

## XY Chart — Bar and Line

```mermaid
xychart-beta
    title "Monthly Active Users"
    x-axis [Jan, Feb, Mar, Apr, May, Jun, Jul, Aug, Sep, Oct, Nov, Dec]
    y-axis "Users (thousands)" 0 --> 50
    bar [12, 15, 18, 22, 28, 35, 32, 30, 38, 42, 45, 48]
    line [12, 15, 18, 22, 28, 35, 32, 30, 38, 42, 45, 48]
```
