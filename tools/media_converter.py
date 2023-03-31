# NB: this script is NOT Python 2 compatible!

import argparse
import csv
import os
import re

from PIL import Image
from shutil import copyfile


def main(args):
    csv_id_to_photo_file_name_mapping = {}
    id_to_photo_mapping = {}
    output_path = os.path.join(args.photos_root, f'converted_photos')

    print('\nStarting KujaKuja media conversion tool...')

    if args.photos_csv is not None:
        # You can use pgAdmin to download a CSV using the following queries:
        # SELECT id, name, photo_file_name, photo_content_type, photo_file_size, photo_updated_at FROM public.settlements ORDER BY id
        # SELECT id, name, photo_file_name, photo_content_type, photo_file_size, photo_updated_at FROM public.service_points ORDER BY id
        print(f"Using '{args.photos_csv}' as a supplemental file for photo selection")
        with open(args.photos_csv) as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                if row['photo_file_name']:
                    id = int(row['id'])
                    csv_id_to_photo_file_name_mapping[id] = row['photo_file_name']

    for entry in os.scandir(args.photos_root):
        messages = []
        print_worthy = args.verbose

        if not entry.is_dir() or not re.match('\d+$', entry.name):
            continue

        print(f"\nProcessing '{entry.name}'")

        original_images_path = os.path.join(entry.path, 'original')
        if not os.path.exists(original_images_path):
            print("Couldn't find a directory called 'original', skipping")
            continue

        id = int(entry.name)
        sub_entries = list(os.scandir(original_images_path))
        messages.append(f'Contains files: {[e.name for e in sub_entries if e.is_file()]}')
        sub_entries = [e for e in sub_entries if re.match('.*\.(jpg|jpeg|png|bmp)', e.name, re.IGNORECASE)]
        messages.append(f'Contains image files: {[e.name for e in sub_entries]}')

        if len(sub_entries) == 1:
            messages.append(f"Choosing '{sub_entries[0].name}' (the only file)")
            id_to_photo_mapping[id] = sub_entries[0].path
        else:
            if id not in csv_id_to_photo_file_name_mapping:
                messages.append("Don't know which file to choose, skipping")
                print_worthy = True
                continue

            csv_file_name = csv_id_to_photo_file_name_mapping[id]
            if csv_file_name.lower() not in [e.name.lower() for e in sub_entries]:
                messages.append(f"Couldn't find '{csv_file_name}' so don't know which file to choose, skipping")
                print_worthy = True
                continue

            messages.append(f"Choosing '{csv_file_name}' (based on supplemental file for photo selection)")
            print_worthy = True
            for sub_entry in sub_entries:
                if sub_entry.name.lower() == csv_file_name.lower():
                    id_to_photo_mapping[id] = sub_entry.path
                    break

        if print_worthy:
            for message in messages:
                print(message)

    print('\n')

    # save the original and resized versions of the image
    sizes = []
    for size_string in args.resize:
        name, dimensions = size_string.split('=')
        w, h = dimensions.lower().split('x')
        sizes.append({'name': name, 'dimensions': (int(w), int(h))})

    for id, path in id_to_photo_mapping.items():
        file_name_with_extension = os.path.basename(path)
        file_name, extension = os.path.splitext(file_name_with_extension)

        file_output_path = os.path.join(output_path, str(id), f'{file_name}{extension.lower()}')
        if not os.path.exists(file_output_path):
            os.makedirs(os.path.dirname(file_output_path), exist_ok=True)
        copyfile(path, file_output_path)

        image = Image.open(path)

        for size in sizes:
            if image.width < size['dimensions'][0] or image.height < size['dimensions'][1]:
                print(f"WARNING - {id}:{file_name_with_extension} - Image dimensions {image.size} smaller than requested value of {size['dimensions']}")

            resized = image.copy()
            resized.thumbnail(size['dimensions'])
            # file_output_path = os.path.join(output_path, str(id), f"{file_name}_{size['name'].lower()}{extension.lower()}")
            file_output_path = os.path.join(output_path, str(id), f"{size['name'].lower()}.jpg")
            if not os.path.exists(file_output_path):
                os.makedirs(os.path.dirname(file_output_path), exist_ok=True)
            resized.save(file_output_path)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('photos_root',
                        help="the directory that contains images to convert (images are expected to be in the following directory structure: "
                             "'<photos_root>/<integer entity ID>/original/'")
    parser.add_argument('--photos_csv',
                        help="a supplemental CSV file that helps in determining which original source image to choose when there are multiple (needs to contain at least 'id' and "
                             "'photo_file_name' columns)")
    parser.add_argument('-r', '--resize', required=True, action='append',
                        help="the desired output image name(s) and size(s), for example: '--resize large=1600x1600' (specify this parameter multiple times if multiple sizes are "
                             "required)")
    parser.add_argument('-v', '--verbose', action='store_true')
    args = parser.parse_args()

    main(args)
