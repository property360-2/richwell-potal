# Page snapshot

```yaml
- generic [ref=e7]:
  - generic [ref=e8]:
    - generic [ref=e9]:
      - img "Richwell Logo" [ref=e11]
      - heading "Welcome Back" [level=1] [ref=e12]
      - paragraph [ref=e13]: Sign in to your Richwell Portal
    - generic [ref=e14]:
      - generic [ref=e15]:
        - img [ref=e16]
        - generic [ref=e18]: Login failed
      - generic [ref=e20]:
        - generic [ref=e21]: Username or Email
        - generic [ref=e22]:
          - generic:
            - img
          - textbox "Username or Email" [ref=e23]:
            - /placeholder: Enter your ID or email
            - text: program_head_e2e
      - generic [ref=e24]:
        - generic [ref=e25]:
          - generic [ref=e26]: Password
          - generic [ref=e27]:
            - generic:
              - img
            - textbox "Password" [ref=e28]:
              - /placeholder: ••••••••
              - text: password123
        - link "Forgot password?" [ref=e30] [cursor=pointer]:
          - /url: /forgot-password
      - button "Sign In" [ref=e31] [cursor=pointer]:
        - text: Sign In
        - img [ref=e32]
  - generic [ref=e34]:
    - text: © 2026 Richwell Colleges Inc.
    - text: All rights reserved.
```