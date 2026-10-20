import unittest

import server


class AutoRoutingTests(unittest.TestCase):
    local_pair = [("small", "qwen2.5-coder:7b"), ("big", "deepseek-coder-v2:16b")]
    providers = {
        "ollama": {"configured": True, "models": [
            {"id": "qwen2.5-coder:7b"}, {"id": "deepseek-coder-v2:16b"},
        ]},
        "codex": {"configured": True, "models": [{"id": "gpt-6-astra"}]},
        "claude": {"configured": True, "models": [{"id": "sonnet"}]},
    }

    def route(self, request):
        return server._chat_route(
            [{"role": "user", "content": request}], self.local_pair, self.providers
        )

    def test_simple_question_starts_with_small_local_model(self):
        candidates, reason = self.route("Explain what this function does.")

        self.assertEqual(candidates[0], ("ollama", "qwen2.5-coder:7b"))
        self.assertIn("locally", reason)

    def test_complex_code_change_starts_with_codex_and_falls_back(self):
        candidates, reason = self.route(
            "Refactor the authentication flow across multiple files and migrate the old config."
        )

        self.assertEqual(candidates[:2], [("codex", "gpt-6-astra"), ("claude", "sonnet")])
        self.assertIn("complex", reason)

    def test_security_review_starts_with_claude(self):
        candidates, reason = self.route("Audit the project architecture for security risks.")

        self.assertEqual(candidates[:3], [
            ("claude", "sonnet"), ("codex", "gpt-6-astra"), ("ollama", "qwen2.5-coder:7b"),
        ])
        self.assertIn("review", reason)

    def test_explicit_provider_request_is_honored(self):
        candidates, reason = self.route("Please use GPT CLI to explain this error.")

        self.assertEqual(candidates[0], ("codex", "gpt-6-astra"))
        self.assertIn("requested codex", reason)

    def test_access_question_routes_to_the_named_cli(self):
        candidates, _ = self.route("Can Doaide access GPT CLI for this request?")

        self.assertEqual(candidates[0], ("codex", "gpt-6-astra"))

    def test_unavailable_preferred_provider_falls_back(self):
        providers = {**self.providers, "claude": {"configured": False, "models": []}}
        candidates, _ = server._chat_route(
            [{"role": "user", "content": "Review this security design."}],
            self.local_pair,
            providers,
        )

        self.assertEqual(candidates[0], ("codex", "gpt-6-astra"))

    def test_provider_prompt_names_the_route_do_aide_invoked(self):
        prompt = server._conversation_prompt(self.messages("Can you access GPT?"), "", "codex")

        self.assertIn("Doaide Code app through GPT (Codex CLI)", prompt)
        self.assertIn("do not need to claim the app cannot access that provider", prompt)

    def test_gpt_model_question_routes_to_codex(self):
        candidates, _ = self.route("Which GPT model are you using?")

        self.assertEqual(candidates[0], ("codex", "gpt-6-astra"))

    def test_astra_request_routes_to_that_exact_codex_model(self):
        candidates, _ = self.route("Can you use Astra?")

        self.assertEqual(candidates, [("codex", "gpt-6-astra")])

    def test_generic_model_followup_preserves_previous_cloud_route(self):
        candidates, _ = server._chat_route(
            self.messages("What model are you using?"), self.local_pair,
            self.providers, {"provider": "codex", "model": "gpt-6-astra"},
        )

        self.assertEqual(candidates[0], ("codex", "gpt-6-astra"))

    @staticmethod
    def messages(content):
        return [{"role": "user", "content": content}]


if __name__ == "__main__":
    unittest.main()
