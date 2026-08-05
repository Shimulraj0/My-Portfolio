"""Voice pipeline — wake word, speech-to-text, text-to-speech.

All backends are lazy-loaded so the module imports without the optional
dependencies installed; call ``is_installed()`` to check.
"""
