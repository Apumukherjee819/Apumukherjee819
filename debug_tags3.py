import requests, json

# Try to introspect the TagProblemCountsCategoryNode type
query = """
query {
    matchedUser(username: "apumukherjee819") {
        tagProblemCounts {
            __typename
        }
    }
}
"""

resp = requests.post('https://leetcode.com/graphql', json={'query': query}, headers={'Content-Type': 'application/json'}).json()
print("Response:", json.dumps(resp, indent=2))

# Try to get the actual tag data with different field names
query2 = """
query {
    matchedUser(username: "apumukherjee819") {
        tagProblemCounts {
            advanced {
                __typename
            }
        }
    }
}
"""

resp2 = requests.post('https://leetcode.com/graphql', json={'query': query2}, headers={'Content-Type': 'application/json'}).json()
print("\nAdvanced type:", json.dumps(resp2, indent=2))
