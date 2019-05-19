# jss-umbrella

![](https://user-images.githubusercontent.com/6793205/57978516-853d5c80-7a0f-11e9-9253-92bbb58c137a.png)

Umbrella for Sitecore JSS is a utility that synchronizes items from your Sitecore JSS website to a folder on your computer where you can work directly in your local JSS application even when you're offline. It pulls the current state of your app in Sitecore to your local state. It serves client and server side out of the box and you can deploy straight to docker in Azure. All can be done connected and disconnected.

**Why?**  In Sitecore JSS you can choose between two developer workflow states. I think `Sitecore First` is the one to go with, but you cannot start without the `Code First` approach. 

## Installation

```bash
npm link jss-umbrella
```

## Configuration



## Usage

from the command line you can use:

```bash
umbrella
```

### Options

| Switch | Action | 
| --- | --- |
|-t, --templates     | Sync all the templates from Sitecore                 |
|-p, --placeholders  | Sync all the placeholders from Sitecore              |
|-m, --manifests     | Sync all the component manifests from Sitecore       |
|-c, --content       | Sync all the content from your Sitecore JSS website  |
|-d, --dryrun       | Sync but do not write to disk  |
|-x, --typescript       | Creates manifests in TypeScript  |

*By default, the script will generate JS files.*

## Examples

Help is shown when you run `umbrella -h` or `umbrella --help`

Sync placeholders:

```bash
umbrella -p 
```

Sync templates and write it in TypeScript:

```bash
umbrella -t -x
```

Sync component manifests and write it in TypeScript but do not write to disk:

```bash
umbrella -t -x -d
```
