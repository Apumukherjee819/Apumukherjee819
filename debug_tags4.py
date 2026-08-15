import requests, json

# Try to get tag data with possible field names
query = """
query {
    matchedUser(username: "apumukherjee819") {
        tagProblemCounts {
            advanced {
                tag {
                    name
                }
                problemsSolved
            }
            intermediate {
                tag {
                    name
                }
                problemsSolved
            }
            fundamental {
                tag {
                    name
                }
                problemsSolved
            }
        }
    }
}
"""

resp = requests.post('https://leetcode.com/graphql', json={'query': query}, headers={'Content-Type': 'application/json'}).json()
print(json.dumps(resp, indent=2)[:2000])
