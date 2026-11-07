# Installing the CLI

Run `npm install -g foo-cli` to install the tool. The command needs Node 18 or newer. If you see a permissions error on Linux, fix your npm prefix instead of using sudo.

The tool reads `foo.config.json` from the current directory. Each key maps to one flag, so `"retries": 3` is the same as `--retries 3`. Unknown keys cause an error. This is deliberate: a typo in a config file should fail loudly rather than be ignored.

Logs go to stderr. Results go to stdout. That split lets you pipe the output into another program without filtering. Exit code 0 means success. Exit code 2 means the config was invalid. Any other code is a bug, and we would like to hear about it.
