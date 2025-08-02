# Database Schema Documentation for School Organization Attendance System

## Overview
This document provides a comprehensive overview of the database schema for the School Organization Attendance System. The database is designed to facilitate efficient management of student organizations, academic structures, events, and user roles within a school setting.

## Tables

### 1. Organizations
Stores information about various student organizations.
- **Fields:**
  - `id`: Integer, Primary Key, Auto Increment
  - `name`: String, Organization name
  - `abbreviation`: String, Organization abbreviation
  - `description`: Text, Description of the organization
  - `contact_email`: String, Organization contact email
  - `contact_phone`: String, Organization contact phone
  - `status`: Enum('active', 'inactive', 'suspended', 'expired'), Default 'active'
  - `subscription_start`: Date, Start date of the subscription
  - `subscription_end`: Date, End date of the subscription
  - `is_owner`: Boolean, Indicates if the organization is the owner (e.g., ACES)
  - `logo`: String, Path to the organization's logo file
  - `banner`: String, Path to the organization's banner file
  - `settings`: JSON, Additional settings

### 2. Academic Years
Manages academic years for organizations.
- **Fields:**
  - `id`: Integer, Primary Key, Auto Increment
  - `organization_id`: Integer, Foreign Key to `organizations(id)`
  - `name`: String, Academic year name
  - `start_date`: Date, Start date of the academic year
  - `end_date`: Date, End date of the academic year
  - `is_current`: Boolean, Indicates if it's the current academic year

### 3. Programs
Defines academic programs offered.
- **Fields:**
  - `id`: Integer, Primary Key, Auto Increment
  - `organization_id`: Integer, Foreign Key to `organizations(id)`
  - `name`: String, Program name
  - `code`: String, Program code
  - `description`: Text, Program description

### 4. Subscription Payments
Records payments made for subscriptions.
- **Fields:**
  - `id`: Integer, Primary Key, Auto Increment
  - `organization_id`: Integer, Foreign Key to `organizations(id)`
  - `amount`: Decimal, Payment amount
  - `payment_method`: Enum('cash', 'check', 'bank_transfer', 'other')
  - `payment_date`: Date, Date of payment
  - `receipt_image`: String, Path to receipt image
### 6. Event Types
Categorizes types of events.
- **Fields:**
  - `id`: Integer, Primary Key, Auto Increment
  - `name`: String, Event type name
  - `color`: String, Hex color for UI
  - `status`: Enum('active', 'inactive')

### 7. Events
Manages event details.
- **Fields:**
  - `id`: Integer, Primary Key, Auto Increment
  - `organization_id`: Integer, Foreign Key to `organizations(id)`
  - `title`: String, Event title
  - `description`: Text, Event description
  - `location`: String, Event location
  - `banner`: String, Path to event banner image

### 8. Users
Holds information about users.
- **Fields:**
  - `id`: Integer, Primary Key, Auto Increment
  - `organization_id`: Integer, Foreign Key to `organizations(id)`
  - `first_name`: String, User's first name
  - `last_name`: String, User's last name
  - `email`: String, User's email
  - `password`: String, User's password hash

### 9. Attendance
Tracks attendance records.
- **Fields:**
  - `id`: Integer, Primary Key, Auto Increment
  - `user_id`: Integer, Foreign Key to `users(id)`
  - `date`: Date, Date of attendance
  - `status`: Enum('present', 'absent', 'late', 'excused')

### 10. Roles
Defines roles for role-based access control.
- **Fields:**
  - `id`: Integer, Primary Key, Auto Increment
  - `organization_id`: Integer, Foreign Key to `organizations(id)`
  - `name`: String, Role name
  - `permissions`: JSON, Permissions granted

### 11. Activity Logs
Records user activities.
- **Fields:**
  - `id`: Integer, Primary Key, Auto Increment
  - `user_id`: Integer, Foreign Key to `users(id)`
  - `action`: String, Action performed
  - `details`: JSON, Details of the action

## Relationships
- **Organizations** link to **Academic Years**, **Programs**, **Sections**, **Users**, **Subscription Payments**, **Events**, and **Roles**.
- **Events** may require **Event Registrations**, linking to **Users**.
- **Attendance** records link students to their **Organizations** and **Sections**.

## Indices and Constraints
Indexes and constraints aim to optimize performance and maintain data integrity.
- Unique constraints ensure data consistency in critical tables like **Users**, **Organizations**, and **Roles**.
- Foreign key constraints enforce relationships and optimize query performance.

