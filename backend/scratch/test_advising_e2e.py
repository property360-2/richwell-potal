import re
import os
from playwright.sync_api import sync_playwright

def test_advising():
    with sync_playwright() as p:
        # Launch browser
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        print("--- Starting Student Advising E2E Test (Student 270003) ---")

        try:
            # 1. Login
            print("Navigating to login page...")
            page.goto("http://localhost:5173/login")
            page.wait_for_load_state("networkidle")

            print("Entering credentials for 270003...")
            page.locator('input[name="username"]').fill("270003")
            page.locator('input[name="password"]').fill("password123")
            page.get_by_role("button", name="Sign In").click()

            # Wait for navigation OR error banner
            try:
                page.wait_for_url("**/student", timeout=10000)
                print("Logged in successfully. Redirected to /student.")
            except Exception:
                # Check for error message
                error_message = page.get_by_text("No active account found with the given credentials")
                if error_message.is_visible():
                    print(f"FAILED: Login error: {error_message.inner_text()}")
                else:
                    print(f"FAILED: Login timed out. Current URL: {page.url}")
                page.screenshot(path="login_failure.png")
                return

            # 2. Navigate to Advising
            print("Navigating to student/advising...")
            page.goto("http://localhost:5173/student/advising")
            page.wait_for_load_state("networkidle")

            # 3. Trigger Auto-Generation
            print("Looking for 'Generate Enrollment Slip' button...")
            advising_button = page.get_by_role("button", name="Generate Enrollment Slip")

            if advising_button.is_visible():
                print("Clicking 'Generate Enrollment Slip'...")
                advising_button.click()
                
                # Wait for status change or display
                print("Waiting for advising to process...")
                page.wait_for_timeout(5000)
                page.wait_for_load_state("networkidle")
                
                # Check for success indicators
                if page.get_by_text("PENDING").is_visible() or page.get_by_text("Advising Already Submitted").is_visible() or page.get_by_text("Current Selection").is_visible():
                    print("PASSED: Advising successfully submitted or subjects generated.")
                else:
                    print("WARNING: Button clicked, but status change could not be verified.")
            else:
                if page.get_by_text("Advising Already Submitted").is_visible():
                    print("SKIPPED: Advising was already submitted.")
                else:
                    print("FAILED: 'Generate Enrollment Slip' button not found.")
            
            page.screenshot(path="advising_result.png", full_page=True)
            print("Final screenshot saved to advising_result.png")

        except Exception as e:
            print(f"ERROR: {str(e)}")
            page.screenshot(path="unexpected_error.png")
        finally:
            browser.close()
            print("--- Test Finalized ---")

if __name__ == "__main__":
    test_advising()
