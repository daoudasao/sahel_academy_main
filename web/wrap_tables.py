import os
import re

files_to_update = [
    "app/dashboard/paiements/page.tsx",
    "app/dashboard/formations/page.tsx",
    "app/dashboard/notifications/page.tsx",
    "app/dashboard/utilisateurs/page.tsx",
    "app/dashboard/utilisateurs/[id]/page.tsx",
    "app/dashboard/bourses/[id]/candidatures/page.tsx",
]

for filepath in files_to_update:
    if not os.path.exists(filepath):
        print(f"Skipping {filepath}, does not exist")
        continue

    with open(filepath, 'r') as f:
        content = f.read()

    # We need to wrap <table ...> ... </table> with <div className="table-responsive"> ... </div>
    # Using regex to find <table> tags and closing </table>
    # Be careful to preserve indentation
    
    # We can use a regex replacement with a callable to preserve indentation
    def replacer(match):
        indentation = match.group(1)
        table_content = match.group(2)
        
        # Check if it's already wrapped in table-responsive
        if "table-responsive" in table_content:
            return match.group(0)

        # Indent the table by one tab/2 spaces relative to the wrapper, or just keep as is
        wrapped = f"{indentation}<div className=\"table-responsive\">\n{indentation}  {table_content.replace(chr(10), chr(10) + '  ')}\n{indentation}</div>"
        return wrapped

    # Instead of regex that might fail on nested things, let's just do simple string replacements for the start and end.
    # Find all occurrences of <table and </table>
    lines = content.split('\n')
    new_lines = []
    i = 0
    while i < len(lines):
        line = lines[i]
        if "<table" in line and 'className="table-responsive"' not in lines[i-1] if i > 0 else True:
            # Find indentation
            indent = line[:len(line) - len(line.lstrip())]
            new_lines.append(indent + '<div className="table-responsive">')
            new_lines.append(line)
        elif "</table>" in line:
            indent = line[:len(line) - len(line.lstrip())]
            new_lines.append(line)
            new_lines.append(indent + '</div>')
        else:
            new_lines.append(line)
        i += 1
        
    new_content = '\n'.join(new_lines)
    
    if new_content != content:
        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f"Updated {filepath}")
    else:
        print(f"No changes for {filepath}")
