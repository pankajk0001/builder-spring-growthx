import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('helper_intent', Path(__file__).resolve().parents[1] / 'scripts/hermes-intent.py')
helper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(helper)


class CallLimits(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.ledger = Path(self.directory.name) / 'limits.json'

    def test_blocks_the_101st_call_in_a_rolling_hour(self):
        for index in range(100):
            helper.reserve_call('fictional test input', self.ledger, now=10000 + index)
        with self.assertRaisesRegex(ValueError, 'cap was reached'):
            helper.reserve_call('fictional test input', self.ledger, now=10100)
        self.assertEqual(len(json.loads(self.ledger.read_text())['calls']), 100)

    def test_old_calls_expire_but_reserved_budget_does_not(self):
        helper.reserve_call('fictional test input', self.ledger, now=10000)
        first = json.loads(self.ledger.read_text())['reserved_usd']
        helper.reserve_call('fictional test input', self.ledger, now=13600)
        current = json.loads(self.ledger.read_text())
        self.assertEqual(current['calls'], [13600])
        self.assertGreater(current['reserved_usd'], first)

    def test_reserves_budget_before_the_call_and_blocks_above_five(self):
        self.ledger.write_text(json.dumps({'calls': [], 'reserved_usd': 4.999}))
        with self.assertRaisesRegex(ValueError, 'cap was reached'):
            helper.reserve_call('fictional test input', self.ledger, now=10000)
        self.assertEqual(json.loads(self.ledger.read_text())['calls'], [])

    def test_a_corrupt_ledger_does_not_reset_the_limits(self):
        self.ledger.write_text('broken state')
        with self.assertRaises(ValueError):
            helper.reserve_call('fictional test input', self.ledger, now=10000)
        self.assertEqual(self.ledger.read_text(), 'broken state')

class PilotInput(unittest.TestCase):
    def test_secretary_translation_requires_verified_private_source(self):
        payload = {'task': 'secretary', 'secretaryAuthorized': True, 'board': [{'role': 'Timer', 'member': 'Mira Vale'}], 'messages': [{'id': 'secretary-live-example', 'sender': 'Secretary', 'text': 'make priya the timer'}]}
        helper.validate_payload(payload)
        for patch in [{'secretaryAuthorized': False}, {'messages': [{'id': 'member-live-example', 'sender': 'Secretary', 'text': 'Timer'}]}]:
            with self.assertRaises(ValueError):
                helper.validate_payload({**payload, **patch})

    def test_authorized_pilot_accepts_ordinary_fictional_names(self):
        helper.validate_payload({'pilotAuthorized': True, 'board': [{'role': 'Timer', 'member': 'Mira Vale'}], 'messages': [{'id': 'member-live-madeup', 'sender': 'Mira Vale', 'text': 'I cannot make it'}]})

    def test_legacy_runner_still_rejects_real_mode_without_authorization(self):
        with self.assertRaises(ValueError):
            helper.validate_payload({'testOnly': True, 'board': [{'role': 'Timer', 'member': 'Mira Vale'}], 'messages': [{'id': 'fictional-madeup', 'sender': 'Mira Vale', 'text': 'Timer'}]})

    def test_pilot_rejects_unverified_message_sources(self):
        with self.assertRaises(ValueError):
            helper.validate_payload({'pilotAuthorized': True, 'board': [{'role': 'Timer', 'member': None}], 'messages': [{'id': 'random-chat', 'sender': 'Mira Vale', 'text': 'Timer'}]})
