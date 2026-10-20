import json
import os
import subprocess
import unittest
from unittest.mock import patch

import server


class CliAdapterTests(unittest.TestCase):
    answer = json.dumps({"reply": "Ready", "edits": []})
    messages = [{"role": "user", "content": "Explain this project."}]

    @patch.dict(os.environ, {"ANTHROPIC_API_KEY": "must-not-leak", "ANTHROPIC_BASE_URL": "https://invalid"})
    @patch("server.subprocess.run")
    def test_claude_uses_subscription_login_without_api_keys(self, run):
        run.return_value = subprocess.CompletedProcess(
            args=[], returncode=0, stdout=json.dumps({"result": self.answer}), stderr=""
        )

        response = server._chat_provider("claude", "sonnet", self.messages, "")

        self.assertEqual(response, self.answer)
        command = run.call_args.args[0]
        environment = run.call_args.kwargs["env"]
        self.assertIn("--no-session-persistence", command)
        self.assertEqual(command[command.index("--tools") + 1], "")
        self.assertNotIn("ANTHROPIC_API_KEY", environment)
        self.assertNotIn("ANTHROPIC_BASE_URL", environment)

    @patch.dict(os.environ, {
        "OPENAI_API_KEY": "must-not-leak",
        "CODEX_API_KEY": "must-not-leak",
        "CODEX_ACCESS_TOKEN": "must-not-leak",
    })
    @patch("server.subprocess.run")
    def test_codex_uses_read_only_sandbox_and_strips_api_credentials(self, run):
        def write_answer(command, **_kwargs):
            output_path = command[command.index("--output-last-message") + 1]
            with open(output_path, "w", encoding="utf-8") as output:
                output.write(self.answer)
            return subprocess.CompletedProcess(args=command, returncode=0, stdout="", stderr="")

        run.side_effect = write_answer
        response = server._chat_provider("codex", "gpt-6-astra", self.messages, "")

        self.assertEqual(response, self.answer)
        command = run.call_args.args[0]
        environment = run.call_args.kwargs["env"]
        self.assertEqual(command[:2], ["codex", "exec"])
        self.assertEqual(command[command.index("--model") + 1], "gpt-6-astra")
        self.assertEqual(command[command.index("--sandbox") + 1], "read-only")
        self.assertIn("--ephemeral", command)
        self.assertTrue({"OPENAI_API_KEY", "CODEX_API_KEY", "CODEX_ACCESS_TOKEN"}.isdisjoint(environment))

    @patch.dict(os.environ, {"OPENAI_API_KEY": "must-not-leak"})
    @patch("server.shutil.which", return_value="/usr/local/bin/codex")
    @patch("server.subprocess.run")
    def test_codex_api_key_login_is_not_marked_subscription_ready(self, run, _which):
        run.return_value = subprocess.CompletedProcess(
            args=[], returncode=0, stdout="Logged in using API key", stderr=""
        )

        ready, error = server._cli_login_status(
            "codex", ["login", "status"], ("OPENAI_API_KEY", "CODEX_API_KEY", "CODEX_ACCESS_TOKEN")
        )

        self.assertFalse(ready)
        self.assertIn("ChatGPT", error)
        self.assertNotIn("OPENAI_API_KEY", run.call_args.kwargs["env"])

    def test_expired_claude_subscription_auth_has_a_recovery_hint(self):
        raw = json.dumps({
            "is_error": True,
            "api_error_status": 401,
            "result": "Failed to authenticate. API Error: 401 OAuth access token is invalid.",
        })

        message = server._claude_cli_error(raw)

        self.assertIn("env -u ANTHROPIC_API_KEY claude auth login", message)
        self.assertNotIn("OAuth access token", message)


if __name__ == "__main__":
    unittest.main()
