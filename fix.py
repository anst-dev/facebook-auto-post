import os, re

def clean_captions(root_dir):
    for root, dirs, files in os.walk(root_dir):
        for f in files:
            if f == 'caption.txt':
                path = os.path.join(root, f)
                with open(path, 'r', encoding='utf-8') as file:
                    content = file.read()
                
                # Regex patterns to remove
                content = re.sub(r'\[[\d,\s]+\]', '', content)
                content = re.sub(r'(?m)^(Matched:|Continuing conversation|Answer:|Resumed conversation:).*?\n', '', content + '\n')
                content = re.sub(r'</?div[^>]*>', '', content)
                
                # Also remove extra dashes if any
                content = content.strip()
                
                with open(path, 'w', encoding='utf-8') as file:
                    file.write(content)
                print(f"Cleaned {path}")

if __name__ == "__main__":
    clean_captions('content')
