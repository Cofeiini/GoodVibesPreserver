import os

if __name__ == '__main__':
    dir = "./htmlresources/"
    for filename in os.listdir(dir):
        filePath = os.path.join(dir, filename)
        if os.path.isfile(filePath):
            basename, extension = os.path.splitext(filename)
            if extension.lower() in { ".css", ".html" }:
                newFilename = os.path.join(dir, basename + ".txt")
                fileData = open(filePath, "r").read()
                if os.path.exists(newFilename):
                    with open(newFilename, "w") as targetFile:
                        targetFile.write(fileData)
                else:
                    with open(newFilename, "x") as newFile:
                        newFile.write(fileData)