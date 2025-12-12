# Data Sources & Import Guide

To make this platform as exhaustive as "Have I Been Pwned" or "IntelX", you need to populate the database with leaked credentials. 

## ⚠️ Legal & Ethical Warning

This platform is a tool for defense and security research. 
- **Do not** use this tool to host or distribute stolen data for malicious purposes.
- **Do not** download or import data you do not have permission to possess.
- **Respect privacy** and data protection laws (GDPR, CCPA, etc.).

## Automated Data Fetching

We provide a script to fetch legal and safe datasets to seed your database.

```bash
npm run db:fetch-breaches
```

This script will download:
1. **SecLists Top Passwords**: A list of the most common passwords (safe for testing).
2. **HIBP API Sample**: Fetches a range of real leaked SHA-1 hashes from the "Have I Been Pwned" k-anonymity API. This allows you to have real leak data without downloading cleartext passwords.

## Importing Custom Breach Files

If you have legally obtained breach data (e.g., from your own security audits, research datasets, or internal breach reports), you can import them using the import tool.

```bash
npm run db:import <path_to_file> [source_name]
```

### Supported Formats
The importer expects a text file with one entry per line.

**Plain Passwords:**
```
password123
secret
correcthorsebatterystaple
```

**Password with Count:**
```
password123:500
secret:20
```

## Creating a Massive Database

To achieve "IntelX" scale:

1. **Pwned Passwords Downloader**: You can download the full "Pwned Passwords" dataset (SHA-1 ordered) from [haveibeenpwned.com/Passwords](https://haveibeenpwned.com/Passwords).
   - The file is ~20GB (compressed).
   - Once downloaded, you can modify `scripts/import_file.js` to parse the 7-zip or text file efficiently.

2. **Integration with External APIs**:
   - The backend is designed to check the local database first.
   - For a production deployment, consider adding a fallback to query the HIBP API in real-time if a hash is not found locally.
