# Copyright (c) 2021 The ZMK Contributors
# SPDX-License-Identifier: MIT
'''Metadata command for ZMK.'''

import glob
import json
from jsonschema import validate, ValidationError
import os
import yaml
from textwrap import dedent            # just for nicer code indentation

from west.commands import WestCommand
from west import log                   # use this for user output


class Metadata(WestCommand):
    def __init__(self):
        super().__init__(
            'metadata',  # gets stored as self.name
            'ZMK hardware metadata commands',  # self.help
            # self.description:
            dedent('''Operate on the board/shield metadata.'''))

    def do_add_parser(self, parser_adder):
        parser = parser_adder.add_parser(self.name,
                                         help=self.help,
                                         description=self.description)

        parser.add_argument('subcommand', default="check",
                            help='The subcommand to run. Defaults to "check".', nargs="?")
        return parser           # gets stored as self.parser

    def do_run(self, args, unknown_args):
        schema = json.load(open("../schema/hardware-metadata.schema.json", 'r'))
        failure = False
        for file in glob.glob("boards/**/*.zmk.yml", recursive=True):
            print("Validating: " + file)
            with open(file, 'r') as stream:
                try:
                    metadata = yaml.safe_load(stream)
                    ret = validate(metadata, schema)
                except yaml.YAMLError as exc:
                    failure = True
                    print("Failed loading metadata yaml: " + file)
                    print(exc)
                except ValidationError as vexc:
                    failure = True
                    print("Failed validation of: " + file)
                    print(vexc)

        exit(1 if failure else 0)
